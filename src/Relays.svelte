<script>
    import { createEventDispatcher } from 'svelte';
  
    // Accept relays as a prop
    export let relays = [];
  
    // Create a local copy
    let localRelays = [...relays];
  
    const dispatch = createEventDispatcher();
  
    let showRelays = false;
    let newRelay = '';
  
    function toggleRelays() {
      showRelays = !showRelays;
    }
  
    function addRelay() {
      if (newRelay) {
        localRelays.push(newRelay);
        newRelay = '';
        dispatch('update', localRelays);
      }
    }
  
    function removeRelay(index) {
      localRelays.splice(index, 1);
      dispatch('update', localRelays);
    }
  </script>
  
  <button on:click={toggleRelays}>Relays <span>{relays.length}</span></button>
  
  {#if showRelays}
    <ul>
      {#each relays as relay, index}
        <li>
          {relay} <button on:click={() => removeRelay(index)}>Remove</button>
        </li>
      {/each}
      <li>
        <input type="text" bind:value={newRelay} placeholder="Add new relay..." />
        <button on:click={addRelay}>Add</button>
      </li>
    </ul>
  {/if}