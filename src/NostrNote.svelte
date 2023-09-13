<script>
  import { afterUpdate, onMount } from "svelte";
  import { selectedMessage, zappingMessage, zapsPerMessage } from "./lib/store";
  import { chatData, chatAdapter } from "./lib/store";
  import { nip19 } from "nostr-tools";
  import ZapAmountButton from "./ZapAmountButton.svelte";
  // import { prettifyContent } from '$lib/utils';

  import dayjs from 'dayjs';
  import relativeTime from 'dayjs/plugin/relativeTime';

  dayjs.extend(relativeTime);

  export let event;
  export let responses;
  export let websiteOwnerPubkey;

  let profiles = {};
  let profilePicture;
  let npub;
  let zappingIt;
  let hovering;
  let mobilePR;

  let relativeTimeFromNow;

  let zappedAmount = 0;

  function selectMessage() {
    if ($selectedMessage === event.id) {
      $selectedMessage = null;
    } else {
      $selectedMessage = event.id;
    }
  }

  // delay-fetch responses
  onMount(() => {
    $chatAdapter.delayedSubscribe(
      { kinds: [1, 42, 9735], "#e": [event.id] },
      "responses",
      500
    );
  });

  const byWebsiteOwner = !!websiteOwnerPubkey === event.pubkey;

  $: profiles = $chatData.profiles;
  $: displayName =
    (profiles[event.pubkey] && profiles[event.pubkey].display_name) ||
    `[${event.pubkey.slice(0, 6)}]`;
  // $: nip05 = profiles[event.pubkey] && profiles[event.pubkey].nip05;
  $: zappingIt = $zappingMessage === event.id;
  $: {
    try {
      npub = nip19.npubEncode(event.pubkey);
    } catch (e) {
      npub = event.pubkey;
    }
  }

  $chatAdapter.on("zap", () => {
    zappedAmount =
      $zapsPerMessage[event.id]?.reduce((acc, zap) => acc + zap.amount, 0) || 0;
  });

  $: {
    zappedAmount =
      $zapsPerMessage[event.id]?.reduce((acc, zap) => acc + zap.amount, 0) || 0;
  }

  afterUpdate(() => {
    zappedAmount =
      $zapsPerMessage[event.id]?.reduce((acc, zap) => acc + zap.amount, 0) || 0;
  });

  $: profilePicture =
    (profiles[event.pubkey] && profiles[event.pubkey].picture) ||
    `https://robohash.org/${event.pubkey.slice(0, 1)}.png?set=set1`;

  // const repliedIds = event.tags.filter(e => e[0] === 'e').map(e => e[1]);

  let timestamp = new Date(event.created_at * 1000);

  $: {
    const now = dayjs();
    const then = dayjs(timestamp);
    const diffInSeconds = now.diff(then, 'second');
    const diffInMinutes = now.diff(then, 'minute');
    const diffInHours = now.diff(then, 'hour');
    const diffInDays = now.diff(then, 'day');
    const diffInMonths = now.diff(then, 'month');
    const diffInYears = now.diff(then, 'year');

    if (diffInSeconds < 10) {
      relativeTimeFromNow = "Now";
    } else if (diffInSeconds < 60) {
      relativeTimeFromNow = `${diffInSeconds}s`;
    } else if (diffInMinutes < 60) {
      relativeTimeFromNow = `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      relativeTimeFromNow = `${diffInHours}h`;
    } else if (diffInDays < 365) {
      relativeTimeFromNow = then.format('MMM D');
    } else {
      if (diffInYears >= 1 && diffInMonths >= 6) {
        relativeTimeFromNow = then.format('MMM D, YYYY');
      } else {
        relativeTimeFromNow = then.format('MMM D');
      }
    }
  }
  
</script>



<article class="event">
  <div class="event__content">
    <!-- AVATAR-->
    <div class="event__avatar">
      <a href={`nostr:${npub}`}
        ><img
          src={profilePicture}
          alt="{displayName}'s avatar"
        /></a
      >
      <!-- <button
        class="zap-btn {zappedAmount > 0
          ? 'zap-btn--zapped'
          : ''}"
        on:click|preventDefault={() =>
          ($zappingMessage = $zappingMessage === event.id ? null : event.id)}
      >
        {#if zappedAmount > 0}
          <p>
            ⚡️
            <span>
              {zappedAmount / 1000}
            </span>
          </p>
        {:else}
          ⚡️
        {/if}
      </button> -->
      <!-- <div
        class="
              {zappingIt
          ? 'w-full rounded-full bg-white  drop-shadow-xl justify-between border-2 border-white/50'
          : ' rounded-full w-8 h-8 justify-center'}
              flex items-center ml-5 mt-10 z-10"
      >
        {#if zappingIt}
          {#if mobilePR}
            <div class="">
              <a
                href={`lightning:${mobilePR}`}
                class=""
                >Open in wallet</a
              >
              <button
                class=""
                on:click={() => {
                  $zappingMessage = null;
                }}
              >
                Cancel
              </button>
            </div>
          {:else}
            <div>
              <div>
                <ZapAmountButton icon="👍" amount={500} {event} bind:mobilePR />
              </div>
              <div>
                <ZapAmountButton
                  icon="🤙"
                  amount={2500}
                  amountDisplay={"2.5k"}
                  {event}
                  bind:mobilePR
                />
              </div>
              <div >
                <ZapAmountButton
                  icon="🙌"
                  amount={5000}
                  amountDisplay={"5k"}
                  {event}
                  bind:mobilePR
                />
              </div>
              <div>
                <ZapAmountButton
                  icon="🧡"
                  amount={10000}
                  amountDisplay={"10k"}
                  {event}
                  bind:mobilePR
                />
              </div>
              <div>
                <ZapAmountButton
                  icon="🤯"
                  amount={100000}
                  amountDisplay={"100k"}
                  {event}
                  bind:mobilePR
                />
              </div>
              <div>
                <ZapAmountButton
                  icon="😎"
                  amount={1000000}
                  amountDisplay={"1M"}
                  {event}
                  bind:mobilePR
                />
              </div>
            </div>
          {/if}
        {/if}
      </div> -->
    </div>
  
    <!-- TEXT-->
    <div class="event__text">
      <header>
        <h1>
          {displayName}
        </h1>
        <span title="{timestamp.toLocaleString()}">
          {relativeTimeFromNow}
        </span>
      </header>
      <p class="event__message">
        {event.content}
      </p>
    </div>
  </div>
  
  {#if responses[event.id].length > 0}
    <div class="event__responses">
      {#each responses[event.id] as response}
        <svelte:self {websiteOwnerPubkey} event={response} {responses} />
      {/each}
    </div>
  {/if}
</article>

<style>

.event{
  display: flex;
  flex-direction: column;
  padding: 1rem 1rem 1rem 1rem;
  border-bottom: 1px solid var(--c-lines);
  color: var(--c-3);
  margin: 0 -1rem;
}

.event:last-of-type {
    border-bottom: none;
  }

.event__content{
  display: flex;
  gap: 1rem;
}

.event__avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.event__avatar img {
  aspect-ratio: 1;
  width: 40px;
  border-radius: 40px;
  outline: 1px solid var(--c-lines);
}

.event__text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

header{
  display: flex;
  justify-content: space-between;
}
header h1 {
  font-weight: 900;
  font-size: 1rem;
  margin: 0;
}

p{
  margin: 0;
}

header span{
  margin-right: .5rem;
  color: var(--c-bright);
}

.zap-btn {
  width: 40px;
  height: 40px;
  border-radius: 50px;
  background-color: orange;
  color: white;
  outline: 0;
}

.event__responses{
  border-left: 1px solid var(--c-lines);
    margin-left: calc((40px - 1rem) / 2);
}

.event__message {
  overflow-wrap: anywhere;
  line-height: 1.4em;
  white-space: pre-wrap;
}
</style>