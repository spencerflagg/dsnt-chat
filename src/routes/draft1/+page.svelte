<script>

    import { afterUpdate } from 'svelte';

	import 'websocket-polyfill';
	import Container from '../../Container.svelte';
	import KeyPrompt from '../../KeyPrompt.svelte';
	import ConnectedWidget from '../../ConnectedWidget.svelte';
	import Widget from '../../Widget.svelte';
	import { chatAdapter } from '../../lib/store';
    import Relays from '../../Relays.svelte';

	let chatStarted;
	let chatType = 'GROUP';
	let websiteOwnerPubkey = 'fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52';
	let chatTags = [];
	//let chatId = '9cef2eead5d91df42eba09be363f1272107e911685126ea5e261ac2d93299478';
	let chatReferenceTags = [];
	let relays = [
		'wss://relay.f7z.io',
		// 'wss://nos.lol',
		// 'wss://relay.nostr.band',
        // 'wss://nostr-pub.wellorder.net',
        // 'wss://relay.damus.io',
        // 'wss://relay.f7z.io'
	];

	$: currentTopic = [...chatTags, ...chatReferenceTags][0]

    $: chatId = url && stringToHex(url)

    function handleUpdate(event) {
        relays = event.detail;
        refreshWidget();
    }

    function stringToHex(str) {
        let result = '';

        for (let i = 0; i < str.length; i++) {
            // Convert each character to its char code
            const charCode = str.charCodeAt(i);

            // Convert the char code to its hex representation
            result += charCode.toString(16).padStart(2, '0');
        }

        return result;
    }

    $: chatStarted = !!$chatAdapter

	function currentTopic(topic) {
		return [...chatTags, ...chatReferenceTags].includes(topic)
	}

    $: if (chatStarted) {
        afterUpdate(() => {
            if (searchElement) searchElement.focus();
        });
    }

    let searchElement;

    let inputUrl = "";
    let url = null;

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
        return (str.startsWith("http://") || str.startsWith("https://"));
    };

    function handleEnterKey(event) {
        if (event.keyCode === 13 && isValidUrl(inputUrl)) {
        showComments(inputUrl);
        }
    }

    function showComments(str) {
        if (!str.startsWith("http://") && !str.startsWith("https://")) {
        url = "https://" + str;
        } else {
        url = str;
        }
        inputUrl = "";
        chatType='GROUP'; 
        chatTags=[]; 
        chatReferenceTags=[url];
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
	<title>Nostri.chat / A NOSTR chat widget you control</title>
	<meta property="og:url" content="https://nostri.chat/">
	<meta name="description" content="A chat widget you own, powered by nostr" />
    <meta property="og:description" content="A chat widget you own, powered by nostr" />
</svelte:head>

<main>

    <section id="hero">
        <h1 class="
            text-6xl
            font-black
            my-2
        ">Dissent</h1>

        <h2 class="
            text-2xl lg:text-4xl
            text-bold
        ">The comments section of the internet.</h2>

        <pre>
            {chatType}
            {chatId}
            {chatTags}
            {chatReferenceTags}
        </pre>
    </section>

    {#if !chatStarted}
        <section>
            <KeyPrompt {websiteOwnerPubkey} chatConfiguration={{
                chatType,
                chatId,
                chatTags,
                chatReferenceTags,
            }} {relays} />
        </section>
    {:else}

        <section>
            <div class="max-w-prose text-2xl text-gray-200 tracking-wide leading-9">
                <div class="search-container p-2 w-full resize-none rounded-xl text-gray-600 border back bg-white">
                    {#if !startsWithProtocol(inputUrl)}
                    <span>https://</span>
                    {/if}
                    <input
                        type="text"
                        bind:value={inputUrl}
                        bind:this="{searchElement}"
                        placeholder="paste or enter a URL"
                        on:keyup={handleEnterKey}
                        on:paste={handlePaste(inputUrl)}
                    />
                </div>
                {#if isValidUrl(inputUrl)}
                    <div class="p-2">
                        <button class="bg-purple-900 hover:bg-purple-700 w-full p-4 rounded-xl text-center font-regular text-gray-200" on:click={showComments(inputUrl)}>Show Comments</button>
                    </div>
                {/if}
            </div>
        </section>

        <section class="justify-center">
            {#if url}
                <h3 class="text-2xl lg:text-3xl text-bold url">{url}</h3>
                <div class="shadow-2xl bg-gray-100/90 backdrop-blur-md mb-5 w-96 max-w-screen-sm text-black rounded-3xl px-4 py-5 overflow-auto flex flex-col justify-end ">
                    {#each [refreshKey] as key (key)}
                        <ConnectedWidget {websiteOwnerPubkey} chatConfiguration={{
                            chatType,
                            chatId,
                            chatTags,
                            chatReferenceTags,
                        }} {relays} />
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
        
    <Relays bind:relays on:update={handleUpdate} />

    <div
  class="flex flex-col justify-start items-start gap-[25px] px-[23px] py-[17px] bg-gradient-to-br from-[#f10e0e] to-[#0c84e0]"
>
  <div class="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 relative">
    <p class="flex-grow-0 flex-shrink-0 text-4xl font-bold text-left text-[#eee]">Heading</p>
    <p class="flex-grow-0 flex-shrink-0 text-2xl text-left text-[#eee]">sub heading</p>
  </div>
  <div class="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 relative gap-2">
    <p class="flex-grow-0 flex-shrink-0 text-xs text-left text-white">Label</p>
    <div class="flex justify-start items-center flex-grow-0 flex-shrink-0 gap-4">
      <div
        class="flex justify-start items-center flex-grow-0 flex-shrink-0 w-[203px] relative overflow-hidden gap-2.5 p-2.5 rounded-[20px] bg-white"
      >
        <p class="flex-grow-0 flex-shrink-0 text-xs text-left text-black">search by typing</p>
      </div>
      <div
        class="flex flex-col justify-center items-center flex-grow-0 flex-shrink-0 w-[42px] h-[42px] overflow-hidden gap-2.5 px-px py-[3px] rounded-[30px] bg-[#03d403]"
      ></div>
    </div>
  </div>
</div>
</main>

<style>
	/* div { border: solid red 1px; } */

	@tailwind base;
	@tailwind components;
	@tailwind utilities;

    main{
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
    }

    section{
        width: 90vw;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        padding: 1rem;
    }

    .search-container {
        display: flex;
    }

    .search-container input {
        flex-grow: 1;
    }

    h3.url{
        display: block;
    }
</style>