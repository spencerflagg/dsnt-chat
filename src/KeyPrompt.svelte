<script>
    import { onMount } from "svelte";
    // import QR from 'svelte-qr';
    import { chatAdapter } from './lib/store';
    import NstrAdapterNip07 from './lib/adapters/nip07.js';
    import NstrAdapterNip46 from './lib/adapters/nip46.js';
	import NstrAdapterDiscadableKeys from './lib/adapters/discardable-keys.js';

    export let websiteOwnerPubkey;
    export let chatConfiguration;
    export let relays;

    let hasNostrNip07 = true;
    let publicKey = null;
    let nip46URI;
    let adapterConfig;

    onMount(() => {
        // hasNostrNip07 = !!window.nostr;

        const type = localStorage.getItem('nostrichat-type');

        if (type === 'nip07') {
            useNip07();
        } else if (type === 'nip-46') {
            useNip46();
        }

        adapterConfig = {
            type: chatConfiguration.chatType,
            tags: chatConfiguration.chatTags,
            referenceTags: chatConfiguration.chatReferenceTags,
            websiteOwnerPubkey,
            relays
        }
    });

    function useNip07() {
        window.nostr.getPublicKey().then((pubkey) => {
            localStorage.setItem('nostrichat-type', 'nip07');
            chatAdapter.set(new NstrAdapterNip07(pubkey, adapterConfig))
        });
    }

    import { generatePrivateKey, getPublicKey } from 'nostr-tools';
    import { Connect, ConnectURI } from '@nostr-connect/connect';

    async function useDiscardableKeys() {
        chatAdapter.set(new NstrAdapterDiscadableKeys(adapterConfig))
    }


    async function useNip46() {
        let key = localStorage.getItem('nostrichat-nostr-connect-key');
        let publicKey = localStorage.getItem('nostrichat-nostr-connect-public-key');

        if (key) {
            chatAdapter.set(new NstrAdapterNip46(publicKey, key, adapterConfig))
            return;
        }

        key = generatePrivateKey();

        const connect = new Connect({ secretKey: key, relay: 'wss://nostr.vulpem.com' });
        connect.events.on('connect', (connectedPubKey) => {
            localStorage.setItem('nostrichat-nostr-connect-key', key);
            localStorage.setItem('nostrichat-nostr-connect-public-key', connectedPubKey);
            localStorage.setItem('nostrichat-type', 'nip-46');

            console.log('connected to nostr connect relay')
            publicKey = connectedPubKey;
            chatAdapter.set(new NstrAdapterNip46(publicKey, key))
            nip46URI = null;
        });
        connect.events.on('disconnect', () => {
            console.log('disconnected from nostr connect relay')
        })
        await connect.init();

        let windowTitle, currentUrl, currentDomain;

        try {
            windowTitle = window.document.title || 'Nostrichat';
            currentUrl = new URL(window.location.href);
            currentDomain = currentUrl.hostname;
        } catch (e) {
            currentUrl = window.location.href;
            currentDomain = currentUrl;
        }

        const connectURI = new ConnectURI({
            target: getPublicKey(key),
            relay: 'wss://nostr.vulpem.com',
            metadata: {
                name: windowTitle,
                description: '🔉🔉🔉',
                url: currentUrl,
            },
        });

        nip46URI = connectURI.toString();
    }

    function Nip46Copy() {
        navigator.clipboard.writeText(nip46URI);
    }
</script>

<h1 class="">
    Welcome to DiSseNT
</h1>

<h2 class="">
    How would you like to connect?
</h2>

{#if publicKey}
    <p class="">
        Nostr Connect is a WIP, not fully implemented yet!
    </p>

    <p class="">
        You are currently connected with the following public key:
        <span>{publicKey}</span>
    </p>
{/if}

{#if nip46URI}
    <p class="">
        Scan this with your Nostr Connect (click to copy to clipboard)
    </p>

    <div class=""
        on:click|preventDefault={Nip46Copy}>
        <!-- <QR text={nip46URI} /> -->
    </div>

    <button class="" on:click|preventDefault={() => { nip46URI = null; }}>
        Cancel
    </button>
{:else if !publicKey}
    <div class="btn-list">
        {#if hasNostrNip07}
            <button class="btn" on:click|preventDefault={useNip07}>
                Browser Extension <span class="btn__subheading">(NIP-07)</span>
            </button>
        {/if}


        <button class="btn" on:click|preventDefault={useNip46}>
            Nostr Connect<span class="btn__subheading">(NIP-46)</span>
        </button>

        <button class="btn" on:click|preventDefault={useDiscardableKeys}>
            Anonymous
            <span class="btn__subheading">
                (Ephemeral Keys)
            </span>
        </button>
    </div>
{/if}