<script>
  import {
    chatAdapter,
    chatData,
    selectedMessage,
    zapsPerMessage,
  } from "./lib/store";
  import { onMount } from "svelte";
  import NostrNote from "./NostrNote2.svelte";
  import * as animateScroll from "svelte-scrollto";

  let events = [];
  let responseEvents = [];
  let responses = {};
  let profiles = {};

  export let websiteOwnerPubkey;
  export let chatConfiguration;
  let prevChatConfiguration;

  $: {
    if (chatConfiguration !== prevChatConfiguration && $chatAdapter) {
      $chatAdapter.setChatConfiguration(
        chatConfiguration.chatType,
        chatConfiguration.chatTags,
        chatConfiguration.chatReferenceTags,
        chatConfiguration.chatId
      );
      events = [];
      responses = {};
      rootNoteId = null;
      localStorage.removeItem("rootNoteId");

      // rootNoteId = localStorage.getItem('rootNoteId');
      // if (rootNoteId) {
      //     $chatAdapter.subscribeToEventAndResponses(rootNoteId);
      // }
    }
    prevChatConfiguration = chatConfiguration;
  }

  function getEventById(eventId) {
    let event = events.find((e) => e.id === eventId);
    event = event || responseEvents.find((e) => e.id === eventId);
    return event;
  }

  async function sendMessage() {
    const input = document.getElementById("message-input");
    const message = input.value;
    input.value = "";
    let extraParams = { tags: [], tagPubKeys: [] };

    // if this is the rootLevel we want to tag the owner of the site's pubkey
    if (!rootNoteId && websiteOwnerPubkey) {
      extraParams.tagPubKeys = [websiteOwnerPubkey];
    }

    // if we are responding to an event, we want to tag the event and the pubkey
    if ($selectedMessage) {
      extraParams.tags.push(["e", $selectedMessage, "wss://nos.lol", "root"]);
      extraParams.tagPubKeys.push(getEventById($selectedMessage).pubkey);
    }

    // if (rootNoteId) {
    //     // mark it as a response to the most recent event
    //     const mostRecentEvent = events[events.length - 1];
    //     // go through all the tags and add them to the new message
    //     if (mostRecentEvent) {
    //         mostRecentEvent.tags.forEach(tag => {
    //             if (tag[0] === 'e') {
    //                 extraParams.tags.push(tag);
    //             }
    //         })
    //         extraParams.tags.push(['e', mostRecentEvent.id]);
    //         extraParams.tags.push(['p', mostRecentEvent.pubkey]);
    //     }
    // }

    const noteId = await $chatAdapter.send(message, extraParams);

    if (!rootNoteId) {
      rootNoteId = noteId;
      localStorage.setItem("rootNoteId", rootNoteId);
    }
  }

  async function inputKeyDown(event) {
    if (event.key === "Enter") {
      sendMessage();
      event.preventDefault();
    }
  }

  function messageReceived(message) {
    const messageLastEventTag = message.tags
      .filter((tag) => tag[0] === "e")
      .pop();
    let isThread;

    if (chatConfiguration.chatType === "GLOBAL") {
      isThread = message.tags.filter((tag) => tag[0] === "e").length >= 1;
    } else if (chatConfiguration.chatType === "GROUP") {
      isThread =
        message.tags.filter(
          (tag) => tag[0] === "e" && tag[1] !== chatConfiguration.chatId
        ).length >= 1;
    } else {
      const pubkeysTagged = message.tags
        .filter((tag) => tag[0] === "p")
        .map((tag) => tag[1]);
      isThread = new Set(pubkeysTagged).size >= 2;
    }

    if (!responses[message.id]) {
      responses[message.id] = [];
    }

    if (isThread) {
      // get the last "e" tag, which is tagging the immediate parent
      const lastETag = message.tags.filter((tag) => tag[0] === "e").pop();
      if (lastETag && lastETag[1]) {
        // if there is one, add it to the response
        if (!responses[lastETag[1]]) {
          responses[lastETag[1]] = [];
        }
        responses[lastETag[1]].push(message);
      }

      responseEvents.push(message);
      responseEvents = responseEvents;
    } else {
      // insert message so that it's chronologically ordered by created_at
      let index = 0;
      while (
        index < events.length &&
        events[index].created_at < message.created_at
      ) {
        index++;
      }
      events.splice(index, 0, message);
      events = events;
    }

    responses = responses;

    scrollDown();
  }

  function scrollDown() {
    animateScroll.scrollToBottom({
      container: document.getElementById("messages-container"),
      offset: 999999, // hack, oh well, browsers suck
      duration: 50,
    });
  }

  function zapReceived(zap) {
    const event = events.find((event) => event.id === zap.zappedEvent);
    if (!event) {
      return;
    }

    if (!$zapsPerMessage[event.id]) $zapsPerMessage[event.id] = [];
    $zapsPerMessage[event.id].push(zap);
  }

  function reactionReceived(reaction) {
    const event = events.find((event) => event.id === reaction.id);
    if (!event) {
      return;
    }

    event.reactions = event.reactions || [];
    event.reactions.push(reaction);
    events = events;
  }

  let rootNoteId;
  let channelMetadata = {};

  onMount(() => {
    $chatAdapter.on("message", messageReceived);

    $chatAdapter.on("connectivity", (e) => {
      connectivityStatus = e;
    });

    $chatAdapter.on("reaction", reactionReceived);
    $chatAdapter.on("zap", zapReceived);
    $chatAdapter.on("deleted", (deletedEvents) => {
      deletedEvents.forEach((deletedEventId) => {
        const index = events.findIndex((event) => event.id === deletedEventId);
        if (index !== -1) {
          events[index].deleted = true;
          events = events;
        }
      });
    });

    $chatAdapter.on("profile", ({ pubkey, profile }) => {
      let profiles = $chatData.profiles;
      profiles[pubkey] = profile;

      chatData.set({ profiles, ...$chatData });
    });

    $chatAdapter.on("channelMetadata", (event) => {
      channelMetadata = JSON.parse(event.content);
    });
  });

  let connectivityStatus = {};
  let connectedRelays = 0;
  let totalRelays = 0;

  $: {
    connectedRelays = Object.values(connectivityStatus).filter(
      (status) => status === "connected"
    ).length;
    totalRelays = Object.values(connectivityStatus).length;

    if ($chatAdapter?.pubkey && !profiles[$chatAdapter.pubkey]) {
      $chatAdapter.reqProfile($chatAdapter.pubkey);
    }
  }

  let connectedChatId;

  $: if (connectedChatId !== $chatAdapter?.chatId) {
    connectedChatId = $chatAdapter?.chatId;
    channelMetadata = {};
  }

  $: profiles = $chatData.profiles;

  function selectParent() {
    if (chatConfiguration.chatType === "GROUP") {
      $selectedMessage = null;
    } else {
      // get the last tagged event in the tags array of the current $selectedMessage
      const lastETag = getEventById($selectedMessage)
        .tags.filter((tag) => tag[0] === "e")
        .pop();
      const lastETagId = lastETag && lastETag[1];

      $selectedMessage = lastETagId;
    }

    scrollDown();
  }

  let ownName;
  $: ownName = $chatAdapter?.pubkey ? pubkeyName($chatAdapter.pubkey) : "";

  $: profiles = $chatData.profiles;

  $: profilePicture =
    (profiles[$chatAdapter.pubkey] && profiles[$chatAdapter.pubkey].picture) ||
    `https://robohash.org/${$chatAdapter.pubkey.slice(0, 1)}.png?set=set1`;

  function pubkeyName(pubkey) {
    let name;

    if (profiles[$chatAdapter.pubkey]) {
      let self = profiles[$chatAdapter.pubkey];

      // https://xkcd.com/927/
      name = self.display_name || self.displayName || self.name || self.nip05;
    }

    if (!name) {
      name = `Anonymous [${pubkey.slice(0, 6)}]`;
    }

    return name;
  }
</script>

<!-- TOP -->
<div class="toolbar">
  {#if $chatAdapter?.pubkey}
    <a class="toolbar__avatar" href="https://iris.to/{$chatAdapter.pubkey}">
      <p class="">
        {ownName}
      </p>
      <img src={profilePicture} alt="{ownName}'s avatar" />
    </a>
  {/if}
  <div class="toolbar__stats">
    {#if events}
      <p class="stats__count">
        {events.length}
      </p>
    {/if}
      <!-- <Relays bind:relays on:update={handleUpdate} /> -->
    {#if totalRelays}
        <div class="stats__relays">
            {connectedRelays}/{totalRelays} relays
            <div class="relay-dots">
                {#each Array(totalRelays) as _, i}
                <span
                    class="relay {connectedRelays > i ? 'relay--active' : ''}"
                />
                {/each}
            </div>
        </div>
    {/if}
  </div>
</div>

<!-- BOTTOM -->
<div id="messages-container" class="content content--scrolling">
  <div class="events">
    {#if $selectedMessage}
      <NostrNote
        event={getEventById($selectedMessage)}
        {responses}
        {websiteOwnerPubkey}
      />
    {:else}
      {#each events as event}
        <NostrNote {event} {responses} {websiteOwnerPubkey} />
        {#if event.deleted}
          👆 deleted
        {/if}
      {:else}
        <p>no comments</p>
      {/each}
    {/if}
  </div>

  {#if channelMetadata.name}
    <div class="">
      {#if channelMetadata.picture}
        <img src={channelMetadata.picture} class="" />
      {/if}

      <div class="">
        <div class="">{channelMetadata.name}</div>
        {#if channelMetadata.about}
          <div class="">{channelMetadata.about}</div>
        {/if}
      </div>
    </div>
  {/if}

  {#if $selectedMessage}
    {#if !getEventById($selectedMessage)}
      <h1>Couldn't find event with ID {$selectedMessage}</h1>
    {:else}
      <div class="">
        <a href="#" on:click|preventDefault={selectParent}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class=""
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
            />
          </svg>
        </a>

        <!-- <div class="flex flex-col ml-2">
                <span class="text-lg text-black overflow-hidden whitespace-nowrap text-ellipsis">
                    {getEventById($selectedMessage).content}
                </span>
            </div> -->
      </div>
    {/if}
  {/if}
</div>

<!-- MESSAGE INPUT -->

<div class="message-input">
  <textarea
    type="text"
    id="message-input"
    class=""
    placeholder="leave a comment"
    rows="1"
    on:keydown={inputKeyDown}
  />
  <button type="button" class="" on:click|preventDefault={sendMessage}>
    <!-- Heroicon name: outline/plus -->
    <svg
      aria-hidden="true"
      class="w-6 h-6 rotate-90"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
      /></svg
    >
  </button>
</div>

<style>

  .content {
    flex-grow: 1;
    overflow-y: auto;
  }

  .message-input {
    display: flex;
  }

  .message-input textarea {
    height: auto;
    padding: 1rem;
    flex-grow: 1;
  }

  .message-input button {
    padding: 2rem;
  }

  .events {
    display: flex;
    flex-direction: column;
  }

  .toolbar__avatar{
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    color: var(--c-bright);
  }

  .toolbar__avatar img{
    width: 2rem;
    border-radius: 2rem;
    outline: 1px solid var(--c-lines);
  }

  .toolbar__stats {
    display: flex;
    justify-content: space-between;
    flex-grow: 1;
    align-items: flex-end;
  }

  .stats__count{
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 55px;
    font-weight: 100;
    line-height: .8;
  }

  .relay-dots {
    display: flex;
    gap:.5rem;
  }

  .relay{
    width: 13px;
    height: 13px;
    border-radius: 13px;
    border: 1px solid var(--c-lines);
  }

  .relay--active{
    border-color: var(--c-bright);
    background-color: var(--c-marker);
  }

  p {
    margin: 0;
  }
</style>
