import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Your other stores
export const chatAdapter = writable(null);
export const chatData = writable({ events: [], profiles: {}});
export const selectedMessage = writable(null);
export const zappingMessage = writable(null);
export const zapsPerMessage = writable({});

// Default values
const defaultRelays = [
  "wss://relay.f7z.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
  "wss://relay.damus.io",
  "wss://relay.f7z.io",
  "wss://eden.nostr.land",
  "wss://offchain.pub",
  "wss://soloco.nl"
];

// Read initial state from sessionStorage if available, otherwise use default values
const initialUrl = browser && sessionStorage.getItem('url') !== null 
  ? sessionStorage.getItem('url') 
  : null;

const initialRelays = browser && sessionStorage.getItem('relays') !== null 
  ? JSON.parse(sessionStorage.getItem('relays')) 
  : defaultRelays;

// Create the writable stores
export const url = writable(initialUrl);
export const relays = writable(initialRelays);

// Function to synchronize the URL with sessionStorage
url.subscribe((currentUrl) => {
  if (browser) {
    sessionStorage.setItem("url", currentUrl);
  }
});

// Function to synchronize the relays with sessionStorage
relays.subscribe((currentRelays) => {
  if (browser) {
    sessionStorage.setItem("relays", JSON.stringify(currentRelays));
  }
});
