<script>
  import { onMount, afterUpdate } from "svelte";

  import "websocket-polyfill";
  import KeyPrompt from "../../KeyPrompt.svelte";
  import ConnectedWidget from "../../ConnectedWidget2.svelte";
  //import Relays from "../../Relays.svelte";
  import MetaData from "../../MetaData.svelte";
  import Brand from "../../Brand.svelte";

  import { chatAdapter, url, relays } from '../../lib/store';

  let chatStarted;
  let chatType = "GROUP";
  let websiteOwnerPubkey =
    "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52";
  let chatTags = [];
  //let chatId = '9cef2eead5d91df42eba09be363f1272107e911685126ea5e261ac2d93299478';
  let chatReferenceTags = [];

  $: currentTopic = [...chatTags, ...chatReferenceTags][0];

  $: chatId = $url && stringToHex($url);

  function handleUpdate(event) {
    relays = event.detail;
    refreshWidget();
  }

  function stringToHex(str) {
    let result = "";

    for (let i = 0; i < str.length; i++) {
      // Convert each character to its char code
      const charCode = str.charCodeAt(i);

      // Convert the char code to its hex representation
      result += charCode.toString(16).padStart(2, "0");
    }

    return result;
  }

  $: chatStarted = !!$chatAdapter;

  function currentTopic(topic) {
    return [...chatTags, ...chatReferenceTags].includes(topic);
  }

  $: if (chatStarted) {
    afterUpdate(() => {
      if (searchElement) searchElement.focus();
    });
    refreshWidget();
  }

  let searchElement;

  let inputUrl = "";

  const isValidUrl = (str) => {
    const pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    return !!pattern.test(str);
  };

  const startsWithProtocol = (str) => {
    return str.startsWith("http://") || str.startsWith("https://");
  };

  function handleEnterKey(event) {
    if (event.keyCode === 13 && isValidUrl(inputUrl)) {
      showComments(inputUrl);
    }
  }

  function showComments(str) {
    if (!str.startsWith("http://") && !str.startsWith("https://")) {
      $url = "https://" + str;
    } else {
      $url = str;
    }
    inputUrl = "";
    chatType = "GROUP";
    chatTags = [];
    chatReferenceTags = [$url];
  }

  function handlePaste(event) {
    showComments(event);
    inputUrl = "";
  }

  let refreshKey = 1;

  function refreshWidget() {
    refreshKey++;
  }

</script>

<svelte:head>
  <title>DiSseNT - The web's comment section</title>
  <meta property="og:url" content="https://dsnt.chat/" />
  <meta name="description" content="The web's comment section." />
  <meta
    property="og:description"
    content="The web's comment section."
  />
</svelte:head>

<main>
  <div class="panel">
    <section class="toolbar">
      {#if $url}
        <MetaData url={$url} />
      {/if}
    </section>
    <section class="content">
      <div class="search-wrapper">
        <div class="search">
          <div class="search__bar">
            {#if !startsWithProtocol(inputUrl)}
              <span>https://</span>
            {/if}
            <input
              type="text"
              bind:value={inputUrl}
              bind:this={searchElement}
              placeholder="paste or enter a URL"
              on:keyup={handleEnterKey}
              on:paste={handlePaste(inputUrl)}
            />
          </div>
          {#if isValidUrl(inputUrl)}
            <button class="search__btn" on:click={showComments(inputUrl)}>show comments</button>
          {/if}
        </div>
      </div>
      <div class="brand">
        <Brand />
      </div>
    </section>
  </div>

  <!-- RIGHT -->
  <div class="sidebar">
    {#if !chatStarted}
      <section>
        <KeyPrompt
          {websiteOwnerPubkey}
          chatConfiguration={{
            chatType,
            chatId,
            chatTags,
            chatReferenceTags,
          }}
          relays={$relays}
        />
      </section>
    {/if}
    {#if chatStarted && $url}
      {#each [refreshKey] as key (key)}
        <ConnectedWidget
          {websiteOwnerPubkey}
          chatConfiguration={{
            chatType,
            chatId,
            chatTags,
            chatReferenceTags,
          }}
          relays={$relays}
        />
      {/each}
    {/if}
  </div>
</main>

<style>
  .content {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    flex-grow: 1;
  }

  .brand {
    flex-grow: 0;
  }

  .search-wrapper {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .search__bar {
    display: flex;
    border-bottom: 1px solid var(--c-lines);
    font-size: 2rem;
    align-items: center;
    padding: .5rem;
  }

  .search__bar span{
    color: rgba(255, 255, 255, 0.25);
  }

  .search__bar input {
    color: rgba(255, 255, 255);
    transition: all .3s ease;
    background-color: transparent;
    flex-grow: 1;
    font-size: inherit;
    border: none;
    font-weight: inherit;
  }

  .search__bar input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .search__bar input:focus {
    outline: none;
  }

</style>
