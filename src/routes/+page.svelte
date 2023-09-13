<script>
  // Imports: Library and Svelte Store
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { fade } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { chatAdapter, url, relays } from '../lib/store';

  // Imports: Polyfills and Components
  import "websocket-polyfill";
  import KeyPrompt from "../KeyPrompt.svelte";
  import ConnectedWidget from "../ConnectedWidget.svelte";
  import MetaData from "../MetaData.svelte";
  import Brand from "../Brand.svelte";

  // Local Variables
  let chatStarted;
  let chatType = "GROUP";
  let websiteOwnerPubkey = "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52";
  let chatTags = [];
  let chatReferenceTags = [];
  let searchElement;
  let inputUrl = "";
  let refreshKey = 1;
  let scrollPosition = 0;
  let searchIsFocused;
  let mainElement;

  // Reactive Statements
  //$: currentTopic = [...chatTags, ...chatReferenceTags][0];
  $: chatId = $url && stringToHex($url);
  $: chatStarted = !!$chatAdapter;
  $: if (chatStarted) {
    afterUpdate(() => {
      //if (searchElement) searchElement.focus();
    });
    refreshWidget();
  }

  // Lifecycle Methods
  onMount(() => {
    if (browser) document.addEventListener('keydown', handleGlobalKeydown);
  });

  onDestroy(() => {
    if (browser) document.removeEventListener('keydown', handleGlobalKeydown);
  });

  // Helper Functions
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

  // Event Handlers and UI Logic
  function handleEnterKey(event) {
    if (event.keyCode === 13 && isValidUrl(inputUrl)) {
      showComments(inputUrl);
    }
  }

  function handlePaste(event) {
    let thisEvent = event.clipboardData.getData('Text');
    showComments(thisEvent);
  }

  function handleScroll(event) {
    scrollPosition = event.target.scrollTop;
  }

  function handleGlobalKeydown(event) {
    // Check for Ctrl + /
    if (event.ctrlKey && event.key === '/') {

      searchIsFocused = true;
      // Focus the input element
      searchElement.focus();
      // Clear the input
      searchElement.value = '';
    }
  }

  function searchFocused() {
    searchIsFocused = true;
  }

  function searchBlurred(e) {
    //console.log(e);
    searchIsFocused = false;
    return true;
  }

  function updateFocusState(event) {
    setTimeout(() => {
      searchIsFocused = (event.type === "focus");
      //console.log("isFocused: ", searchIsFocused);
    }, 50);
  }

  function showComments(str) {
    console.log(str);
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

  function refreshWidget() {
    refreshKey++;
  }

  // function currentTopic(topic) {
  //   return [...chatTags, ...chatReferenceTags].includes(topic);
  // }
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

<nav class="content">
  <div class="search-wrapper">
    <div class="search">
      <div class="search__bar {searchIsFocused ? 'search__bar--focused' : ''}">
        {#if !startsWithProtocol(inputUrl)}
          <span>https://</span>
        {/if}
        <input
          type="search"
          bind:value={inputUrl}
          bind:this={searchElement}
          placeholder="type or paste a URL"
          on:keyup={handleEnterKey}
          on:paste={handlePaste}
          on:focus={updateFocusState} 
          on:blur={updateFocusState}
        />
      </div>
      {#if isValidUrl(inputUrl)}
        <button transition:fade={{ delay: 250, duration: 300 }} class="search__btn" on:click={showComments(inputUrl)} title="Show Comments">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-message" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="var(--color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M8 9h8" />
            <path d="M8 13h6" />
            <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</nav>

<div class="page-outer">
  <main class="content--scrolling" on:scroll={handleScroll} bind:this={mainElement}>
  
      <section class="nav">
        <nav>
          <ul>
            <li><a href='/about'>About</a></li>
          </ul>
        </nav>
      </section>

      {#if !chatStarted}
        <section class="brand">
          <Brand />
        </section>
        <section class="key-prompt">
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
        <section class="brand hide-on-mobile">
          <Brand />
        </section>

        <section class="shortcuts hide-on-mobile">
          <ul>
            <li>
              <strong>Ctrl + /</strong> to change the URL
            </li>
            <li>
              <strong>Ctrl + space</strong> to type a comment
            </li>
          </ul>
        </section>

        <section class="metadata">
          {#if $url}
            <MetaData url={$url} scrollPosition={scrollPosition}/>
          {/if}
        </section>

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
            mainElement={mainElement}
          />
        {/each}
      {/if}
  </main>
</div>

<style>



@media only screen and (max-width: 598px) {
  main {
    width: fit-content;
    border: none;
  }
  nav {
    width: 100% !important;
  }
  section {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
  }
  .search__bar{
    font-size: 5vmin !important;
  }
}

@media only screen and (max-width: 1140px) {
  section {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
  }

  section.brand {
    order: -1;
    margin-top: 1rem;
  }

  section.shortcuts {
    order: 0;
  }
}


nav{
  width: 566px;
  align-self: center;
  flex-shrink: 0;
}

  .content {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    
  }

  section.brand {
    position: fixed;
    bottom: 1rem;
    left: 2rem;
  }

  section.metadata {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top:0;
    z-index: 1;
  }

  section.nav{
    position: fixed;
    top: 1rem;
    left: 1rem;
  }

  section.shortcuts {
    position: fixed;
    top:6rem;
    left: 2rem;
  }

section.shortcuts ul {
  padding: 0;
}

section.shortcuts li {
  list-style-type: none;
  color: var(--c-lines);
}

  .search-wrapper {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .search {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .search button {
    position: absolute;
    height: 100%;
    text-transform: uppercase;
    width: max-content;
  }

.search__btn svg {
  width: 2rem;
  --color: var(--c-bright);
}

.search__btn {
  border: 0;
}

  .search__bar {
    display: flex;
    border-bottom: 1px solid var(--c-lines);
    font-size: 2rem;
    align-items: center;
    padding: .5rem;
    flex-grow: 1;
  }

  .search__bar span{
    color: rgba(255, 255, 255, 0.25);
    font-family: Work Sans, sans-serif;
  }

  .search__bar input {
    color: rgba(255, 255, 255);
    transition: all .3s ease;
    background-color: transparent;
    font-size: inherit;
    border: none;
    font-weight: inherit;
    font-family: Work Sans, sans-serif;
    width: calc(100% - 10rem);
  }

  .search__bar input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .search__bar input:focus {
    outline: none;
  }  
  
  .search__bar.search__bar--focused {
    border-bottom: 1px solid var(--c-bright);
  }

</style>
