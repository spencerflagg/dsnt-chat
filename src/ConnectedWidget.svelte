<script>
  import {
    chatAdapter,
    chatData,
    selectedMessage,
    zapsPerMessage,
  } from "./lib/store";
  import { onMount, onDestroy } from "svelte";
  import NostrNote from "./NostrNote.svelte";
  import * as animateScroll from "svelte-scrollto";
  import { browser } from '$app/environment';

  let events = [];
  let responseEvents = [];
  let responses = {};
  let profiles = {};

  export let websiteOwnerPubkey;
  export let chatConfiguration;
  let prevChatConfiguration;

  export let mainElement;

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
    autoExpandTextarea(event);
    if (event.key === "Enter" && !event.ctrlKey) {
      sendMessage();
      event.preventDefault();
    }
    if (event.key === "Enter" && event.ctrlKey) {
      messageInput += "\n";
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
      // let index = 0;
      // while (
      //   index < events.length &&
      //   events[index].created_at < message.created_at
      // ) {
      //   index++;
      // }
      let index = events.length;
      while (index > 0 && events[index - 1].created_at < message.created_at) {
          index--;
      }
      events.splice(index, 0, message);
      events = events;
    }

    responses = responses;

    //scrollDown();
  }

  function scrollUp() {
    animateScroll.scrollToTop({
      container: mainElement,
      offset: 0,
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

    if (browser)
      document.addEventListener('keydown', handleGlobalKeydown);
      if (mainElement)
        mainElement.addEventListener("scroll", checkVisibility);
        checkVisibility(); // initial check
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

  function autoExpandTextarea(event) {
    //console.log('autoExpandTextarea');
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight - 16}px`;
  }

  let messageInput = "";
  let messageElement;

  onDestroy(() => {
    if (browser)
      document.removeEventListener('keydown', handleGlobalKeydown);
      mainElement.removeEventListener("scroll", checkVisibility);
  });

  let anchor;
  
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (mainElement.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (mainElement.innerWidth || document.documentElement.clientWidth)
    );
  }

  function checkVisibility() {
    //console.log('check')
    if (isElementInViewport(messageElement)) {
      anchor.style.display = 'none';
    } else {
      anchor.style.display = 'block';
      anchor.style.transform = 'translateY(6rem)';
    }
  }

  function handleGlobalKeydown(event) {
    // Check for Ctrl + /
    if (event.ctrlKey && event.key === ' ') {

      // Focus the input element
      messageElement.focus();
    }
  }
</script>

<!-- TOP -->
{#if $chatAdapter?.pubkey}
<section class="profile">
    <a class="toolbar__avatar" href="nostr:{$chatAdapter.pubkey}">
      <p class="hide-on-mobile">
        {ownName}
      </p>
      <img src={profilePicture} alt="{ownName}'s avatar" />
    </a>
  </section>
  {/if}
  {#if events}
  <section class="stats">
      <p class="stats__count">
        {events.length} comments
      </p>
  </section>
    {/if}
    {#if totalRelays}
    <section class="relays">
          <!-- <Relays bind:relays on:update={handleUpdate} /> -->
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
        </section>
    {/if}

<section class="input">
  <textarea
    type="text"
    id="message-input"
    class=""
    placeholder="leave a comment"
    rows="4"
    on:keydown={inputKeyDown}
    bind:value={messageInput}
    bind:this={messageElement}
  />
  <button type="button" class="btn btn--comment" on:click|preventDefault={sendMessage} disabled={!messageInput}>
    <svg width="250" height="250" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path vector-effect="non-scaling-stroke" d="M177.203 67.4466C175.78 68.8692 174.784 71.1454 174.784 72.4258C174.784 73.9907 171.939 75.5556 165.253 77.5473C74.9157 104.293 24.1278 118.946 21.8516 118.946C18.295 118.946 15.023 119.48 15.023 114.251C13.8849 111.264 3.7842 110.837 1.36573 113.824C0.227621 115.105 -0.199168 120.226 0.0853578 127.766L0.512147 139.574C0.512147 139.574 0.938937 141.85 7.6253 142.277C14.3117 142.704 15.4498 140.143 15.4498 137.582C15.4498 134.595 16.3033 134.595 21.5671 134.595C26.8308 134.595 50.3042 140.57 52.0114 142.277C52.4382 142.561 51.8691 145.549 51.0155 148.963C48.8816 156.788 50.1619 163.19 54.8566 167.884C58.2709 171.299 78.6145 178.696 100.523 184.387C111.62 187.232 120.298 182.111 123.712 170.445C124.708 167.173 126.13 164.47 126.984 164.47C127.838 164.47 138.934 167.458 151.595 171.156C169.947 176.42 174.784 178.412 174.784 180.261C174.784 186.378 190.433 186.343 190.433 180.83C190.433 178.341 190.433 175.709 190.433 126.059V69.296C190.433 63.4633 180.048 64.3168 177.203 67.4466ZM90.5647 153.231L116.741 160.913L115.887 165.75C114.856 172.295 110.766 176.136 106.214 176.136C103.084 176.278 73.9199 167.742 64.815 164.185C58.9823 161.909 57.5596 158.21 59.5513 150.67C60.5471 147.256 62.112 144.695 62.9656 144.98C63.8192 145.264 76.3383 148.963 90.5647 153.231Z" fill="black"/>
      <path vector-effect="non-scaling-stroke" d="M222.869 85.5143C210.35 92.7697 209.212 94.1924 212.2 97.1799C214.191 99.1716 215.756 98.6025 227.422 91.9161C236.527 86.6524 240.225 83.8072 239.941 82.1C239.087 77.9744 233.966 78.9702 222.869 85.5143Z" fill="black"/>
      <path vector-effect="non-scaling-stroke" d="M214.191 120.795C212.484 125.348 215.329 126.201 232.543 125.775C248.903 125.348 249.472 125.205 249.899 122.076C250.326 118.946 250.184 118.946 232.685 118.946C219.17 118.946 214.76 119.373 214.191 120.795Z" fill="black"/>
      <path vector-effect="non-scaling-stroke" d="M211.204 148.252C209.923 151.524 210.635 152.235 223.296 159.491C235.104 166.32 239.514 167.031 239.514 162.478C239.514 160.629 235.957 157.641 227.422 152.805C214.334 145.407 212.484 144.838 211.204 148.252Z" fill="black"/>
      </svg>
  </button>
</section>

<button class="btn btn--scroll-to-top" bind:this={anchor} on:click={scrollUp}>leave a comment 👆️</button>

<section id="messages-container" class="comments">
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
        <div class="events--empty"><svg width="5411" height="2123" viewBox="0 0 5411 2123" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3380.65 973.032C3418.5 958.188 3455.05 962.571 3463.09 983.057C3471.12 1003.56 3457.08 1044.01 3419.24 1058.85C3381.39 1073.71 3351.98 1063.54 3343.94 1043.05C3335.9 1022.57 3342.8 987.889 3380.65 973.032ZM4573.98 1400.11L4627.9 1410.25C4627.3 1343.87 4635.19 1279.91 4651.56 1218.35C4664.87 1168.39 4622.82 1178.14 4597.83 1199.7C4532.73 1255.89 4482.65 1295.84 4398.44 1323.92C4452.51 1308.23 4494.79 1292.51 4525.34 1276.73C4548.65 1304.36 4564.04 1332.94 4568.68 1362.16C4572.11 1375.77 4573.87 1388.42 4573.98 1400.11ZM4631.05 1474.38L4554.13 1459.41C4540.53 1475.44 4519.95 1487.5 4492.38 1495.55C4545.74 1499.86 4593.27 1504.8 4634.99 1510.38C4633.41 1498.3 4632.1 1486.3 4631.05 1474.38ZM4111.98 1470.93C4130.81 1468.83 4150.26 1465.16 4170.34 1459.96C4246.91 1498.24 4350.64 1523.59 4481.54 1536C4541.88 1545.67 4595.36 1552.07 4642 1555.22C4649.15 1594.76 4659.02 1635.07 4671.63 1676.15C4686.1 1718.95 4725.49 1805.03 4789.82 1934.38C4884.53 1932.78 4948.47 1949.91 4981.63 1985.77C4959.63 1925.21 4904.08 1896.91 4824.5 1898.92C4799.19 1870.42 4767.43 1797.59 4729.22 1680.4C4716.52 1642.51 4707.18 1601.54 4701.15 1557.51C4743.56 1557.7 4778.42 1554.33 4805.75 1547.35C4779.24 1537.11 4742.95 1527.96 4696.89 1519.85C4695.91 1508.99 4695.11 1497.95 4694.5 1486.73L4916.99 1530.06L4693.42 1459.91C4693.26 1454.1 4693.15 1448.24 4693.08 1442.35L4828.01 1447.91L4693.07 1422.52C4693.53 1363.01 4698.74 1299.16 4708.68 1230.93C4713.38 1198.78 4711.9 1146.9 4691.37 1120.9C4662.99 1084.95 4612.76 1079.02 4570.51 1082.47C4509.35 1087.45 4449.72 1097.2 4391.64 1111.7C4440.19 1063.71 4483.02 1007.98 4529.75 962.192C4555.13 937.327 4588.51 924.173 4609.88 965.206C4715.84 1168.84 4865.92 1345.13 5029.49 1457.19C5086.57 1410.5 5141.77 1388.92 5195.07 1392.46C5151.96 1368.34 5094.67 1371.64 5034.25 1408.11C4926.14 1352.32 4798.13 1195.33 4639.99 931.808C4613.8 888.183 4558.12 865.244 4509.68 883.117C4460.51 901.275 4315.82 985.788 4192.91 1070.24C4080.21 1023.03 3967.15 987.108 3893.34 967.221C3883.16 1009.89 3865.53 1047.66 3840.47 1080.49C3854.52 1054.98 3866.84 1024.09 3876.66 989.325C3880.67 975.103 3886.44 964.062 3878.72 950.73C3871.68 938.544 3854.39 932.05 3826.88 931.248C3731.85 921.424 3632.36 916.093 3578.95 919.712C3584.86 949.635 3581.66 985.95 3566.18 1011.73C3574.99 980.99 3574.87 955.709 3564.07 934.415C3552.16 910.948 3532.78 907.867 3509.77 901.687C3482.31 894.316 3456.79 889.891 3433.3 888.486C3562.71 629.059 3669.88 377.849 3725.05 159.076C3690.14 281.186 3515.99 712.504 3410.25 888.092C3387.96 888.719 3367.8 892.426 3349.87 899.287C3350.85 897.038 3351.72 894.618 3352.45 892.027C3410.8 512.544 3366.43 215.374 3219.34 0.491378C3369.8 271.908 3394.35 590.242 3327.45 910.229C3299.68 927.057 3278.9 953.526 3265.74 989.962C3255.13 1019.63 3247.47 1046.15 3242.75 1069.55C3219.44 1053.93 3196.62 1045.4 3174.28 1043.96C3135.32 1037.91 3103.4 1039.61 3078.51 1049.06C3040.8 1052.4 3006.51 1049.88 2975.65 1041.5C2937.13 1031.04 2930.67 1066.82 2970.77 1072.25C3011.16 1077.7 3046.4 1074.21 3076.5 1061.8C3105.03 1074.98 3137.01 1073.06 3172.44 1056.05C3188.29 1072.41 3210.55 1083.93 3239.19 1090.63C3237.54 1102.94 3236.86 1114.21 3237.15 1124.45C3231.8 1124.83 3226.59 1125.45 3221.51 1126.32C3193.98 1137.16 3172.7 1148.72 3157.69 1160.96C3134.87 1233.43 3123.91 1281.3 3124.8 1304.58C3164.41 1314.8 3176.55 1274.7 3161.23 1184.28C3170.59 1184.77 3179.31 1187.39 3185.62 1191.12C3193.88 1196.01 3199.57 1195.71 3207.37 1190.21C3219.25 1181.83 3229.39 1168.96 3237.79 1151.65L3241 1152.4C3256.75 1209.57 3319.99 1216.33 3430.76 1172.63C3472.25 1169.49 3511.98 1144.71 3549.97 1098.28C3540.59 1160.87 3555.3 1201.62 3594.12 1220.6C3605.78 1229.74 3617.35 1238.56 3628.83 1247.02C3603.06 1278.47 3584.12 1398.61 3582.72 1438C3574.41 1472.99 3558.7 1507.24 3530.65 1543.62C3491.22 1519.83 3455 1527.14 3426.96 1562.68C3471.97 1550.53 3508.83 1553.88 3537.54 1572.73C3569.07 1553.5 3597.2 1511.15 3621.92 1445.7C3638.27 1353.91 3654.57 1307 3670.82 1304.98C3675.88 1353.33 3698.91 1355.27 3716.6 1342.96C3725.79 1336.58 3732.57 1327.93 3736.73 1318.18C3740.3 1320.24 3743.87 1322.27 3747.42 1324.26C3747.01 1336.26 3751.17 1350.73 3761.93 1366.66C3795.38 1416.15 3832.07 1443.51 3872.95 1442.68C3913.73 1441.84 3930.41 1444.09 3930.49 1497.35C3930.61 1581.12 3942.1 1655.31 3964.92 1719.93C3987.99 1759.24 4020.17 1800.96 4061.44 1845.1C4117.43 1845.98 4155.67 1865.08 4176.15 1902.4C4168.52 1844.84 4134.75 1820.65 4073.79 1822.52C4048.9 1797.11 4019.1 1754.39 3996.26 1707.36C3978.13 1643.55 3971.08 1571.49 3963.24 1478.25C3963.91 1442.74 3958.22 1417.63 3945.11 1398.75C3955 1400.43 3964.79 1401.76 3974.47 1402.71C3981.98 1447.36 4024.15 1480.75 4111.98 1470.93Z" fill="black"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M2031.03 973.032C1993.18 958.188 1956.63 962.571 1948.59 983.057C1940.55 1003.55 1954.6 1044.01 1992.44 1058.85C2030.29 1073.71 2059.7 1063.54 2067.74 1043.05C2075.78 1022.56 2068.88 987.889 2031.03 973.032ZM837.693 1400.11L783.773 1410.25C784.374 1343.87 776.483 1279.91 760.114 1218.35C746.809 1168.39 788.86 1178.14 813.851 1199.7C878.945 1255.89 929.03 1295.84 1013.23 1323.92C959.172 1308.23 916.888 1292.51 886.337 1276.73C863.026 1304.36 847.633 1332.94 842.999 1362.16C839.563 1375.77 837.803 1388.42 837.693 1400.11ZM780.625 1474.38L857.543 1459.41C871.144 1475.44 891.726 1487.5 919.294 1495.55C865.94 1499.86 818.412 1504.8 776.686 1510.38C778.269 1498.3 779.58 1486.3 780.625 1474.38ZM1299.7 1470.93C1280.87 1468.83 1261.42 1465.16 1241.34 1459.96C1164.77 1498.24 1061.04 1523.59 930.134 1536C869.793 1545.67 816.322 1552.07 769.682 1555.22C762.523 1594.76 752.661 1635.07 740.049 1676.15C725.581 1718.95 686.184 1805.03 621.857 1934.38C527.15 1932.78 463.206 1949.91 430.05 1985.77C452.046 1925.21 507.6 1896.91 587.177 1898.92C612.491 1870.42 644.243 1797.59 682.454 1680.4C695.161 1642.51 704.501 1601.54 710.523 1557.51C668.116 1557.7 633.255 1554.33 605.931 1547.35C632.438 1537.11 668.731 1527.96 714.79 1519.85C715.771 1508.99 716.569 1497.95 717.179 1486.73L494.692 1530.06L718.261 1459.91C718.415 1454.1 718.53 1448.24 718.593 1442.35L583.662 1447.91L718.609 1422.52C718.151 1363.01 712.94 1299.16 702.995 1230.93C698.302 1198.78 699.777 1146.9 720.307 1120.9C748.691 1084.95 798.92 1079.02 841.172 1082.46C902.332 1087.45 961.954 1097.2 1020.03 1111.7C971.492 1063.71 928.661 1007.98 881.925 962.192C856.545 937.327 823.163 924.172 801.802 965.206C695.841 1168.84 545.755 1345.13 382.185 1457.19C325.104 1410.5 269.903 1388.92 216.604 1392.46C259.722 1368.34 317.008 1371.64 377.426 1408.11C485.537 1352.32 613.548 1195.33 771.691 931.808C797.88 888.183 853.56 865.244 901.996 883.117C951.171 901.275 1095.85 985.787 1218.77 1070.24C1331.47 1023.03 1444.53 987.108 1518.34 967.221C1528.52 1009.89 1546.14 1047.66 1571.2 1080.49C1557.16 1054.98 1544.84 1024.09 1535.01 989.325C1531.01 975.103 1525.24 964.062 1532.95 950.73C1540 938.544 1557.28 932.05 1584.8 931.247C1679.83 921.424 1779.32 916.092 1832.73 919.712C1826.82 949.635 1830.02 985.95 1845.5 1011.73C1836.68 980.99 1836.81 955.709 1847.61 934.415C1859.51 910.948 1878.9 907.866 1901.91 901.687C1929.36 894.316 1954.89 889.891 1978.37 888.486C1848.97 629.058 1741.8 377.849 1686.62 159.076C1721.54 281.185 1895.68 712.504 2001.43 888.092C2023.71 888.719 2043.88 892.426 2061.8 899.287C2060.82 897.038 2059.96 894.618 2059.23 892.027C2000.88 512.544 2045.25 215.374 2192.33 0.491134C2041.87 271.908 2017.32 590.242 2084.23 910.229C2111.99 927.057 2132.78 953.525 2145.93 989.962C2156.55 1019.63 2164.21 1046.15 2168.92 1069.55C2192.24 1053.93 2215.06 1045.4 2237.4 1043.96C2276.36 1037.91 2308.28 1039.61 2333.16 1049.06C2370.88 1052.4 2405.17 1049.88 2436.02 1041.5C2474.55 1031.04 2481 1066.82 2440.9 1072.25C2400.52 1077.7 2365.28 1074.21 2335.18 1061.8C2306.64 1074.98 2274.66 1073.06 2239.24 1056.05C2223.38 1072.41 2201.13 1083.93 2172.49 1090.63C2174.14 1102.94 2174.82 1114.21 2174.53 1124.45C2179.87 1124.83 2185.09 1125.45 2190.17 1126.32C2217.7 1137.16 2238.98 1148.72 2253.99 1160.95C2276.81 1233.43 2287.77 1281.3 2286.88 1304.58C2247.27 1314.8 2235.13 1274.7 2250.45 1184.28C2241.09 1184.77 2232.36 1187.39 2226.05 1191.12C2217.79 1196.01 2212.11 1195.71 2204.31 1190.21C2192.43 1181.83 2182.29 1168.96 2173.88 1151.65L2170.68 1152.4C2154.93 1209.57 2091.69 1216.33 1980.91 1172.63C1939.43 1169.49 1899.7 1144.71 1861.71 1098.28C1871.09 1160.87 1856.38 1201.62 1817.55 1220.6C1805.9 1229.74 1794.33 1238.56 1782.85 1247.01C1808.61 1278.47 1827.55 1398.61 1828.96 1438C1837.27 1472.99 1852.97 1507.24 1881.03 1543.62C1920.45 1519.83 1956.67 1527.14 1984.72 1562.68C1939.71 1550.53 1902.85 1553.88 1874.14 1572.73C1842.61 1553.5 1814.47 1511.15 1789.76 1445.7C1773.41 1353.91 1757.11 1307 1740.86 1304.98C1735.8 1353.33 1712.77 1355.27 1695.08 1342.96C1685.88 1336.58 1679.11 1327.93 1674.95 1318.18C1671.37 1320.24 1667.81 1322.27 1664.25 1324.26C1664.66 1336.26 1660.51 1350.73 1649.75 1366.66C1616.29 1416.15 1579.61 1443.51 1538.73 1442.68C1497.95 1441.84 1481.27 1444.09 1481.19 1497.35C1481.06 1581.12 1469.58 1655.31 1446.75 1719.93C1423.69 1759.24 1391.51 1800.96 1350.23 1845.1C1294.25 1845.98 1256.01 1865.08 1235.53 1902.4C1243.16 1844.84 1276.93 1820.65 1337.89 1822.52C1362.78 1797.11 1392.58 1754.39 1415.42 1707.36C1433.55 1643.54 1440.59 1571.49 1448.43 1478.25C1447.77 1442.74 1453.46 1417.63 1466.57 1398.75C1456.68 1400.43 1446.89 1401.76 1437.21 1402.71C1429.7 1447.36 1387.53 1480.75 1299.7 1470.93Z" fill="black"/>
          </svg></div>
      {/each}
    {/if}
  </div>

  {#if channelMetadata.name}
    <div class="">
      {#if channelMetadata.picture}
        <img src={channelMetadata.picture} class="" alt="{channelMetadata.name} thumbnail" />
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
              vector-effect="non-scaling-stroke"
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
</section>


<style>

  section.input {
    display: flex;
  }

  section.input textarea {
    height: auto;
    padding: 1rem;
    flex-grow: 1;
  }

  section.input button {
    padding: 1rem;
  }

  .events {
    display: flex;
    flex-direction: column;
  }

  section.profile {
    position: fixed;
    top: 1rem;
    right: 1rem;
  }

  section.relays {
    position: fixed;
    bottom: 1rem;
    right: 2rem;
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

  section.stats {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .stats__count{
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 55px;
    font-weight: 100;
    line-height: .8;
    color: var(--c-lines);
  }

  .relay-dots {
    display: flex;
    gap:.5rem;
  }

  .relay{
    width: 11px;
    height: 11px;
    border-radius: 11px;
    border: 1px solid var(--c-lines);
  }

  .relay--active{
    border-color: var(--c-marker);
    background-color: var(--c-marker);
  }

  p {
    margin: 0;
  }

section.input textarea{
  resize: none;
  background-color: var(--c-lines);
  border: none;
}

section.input textarea::placeholder{
  color: var(--c-bright);
}

section.input textarea:focus{
  outline: none;
  background-color: var(--c-bright);
}

section.input textarea:focus + button{
  border-color: var(--c-bright);
}

section.input textarea:focus + button{
  --color: var(--c-bright);
}

section.input textarea:focus + button svg path{
  stroke: var(--c-bright);
}

  .btn--comment {
    --color: var(--c-lines);
    padding: 1rem;
  }

  .btn--comment:disabled {
    cursor: not-allowed;
  }

  .btn--comment:disabled svg path{
    fill:none;
    stroke: var(--c-lines);
  }

.btn--comment svg{
  width: 3rem;
  height: 3rem;
}

.btn--comment svg path{
  fill: var(--color);
}

.events--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
  justify-content: center;
}

.events--empty svg{
  max-width: 50%;
  height: auto;
}

.events--empty svg path{
  fill: rgba(0,0,0,.3);
}

.comments {
  flex-grow: 1;
}

.events {
  min-height: 100%;
}


.stats__relays{
    display: flex;
    flex-direction: column;
    gap: .5rem;
    align-items: end;
    color: var(--c-lines);
  }

  .btn.btn--scroll-to-top {
    transition: all .3s;
    transform: translateY(-3rem);
    position: sticky;
    top: 0;
    left: 5rem;
    /* z-index: 2; */
    background: var(--c-bright);
    padding: 0.25em 0.75em;
    /* display: inline-block; */
    align-self: center;
    border-radius: 2rem;
    font-size: 1.5rem;
    color: black;
    font-weight: 300;
    text-decoration: none;
    z-index: 1;
  }
</style>
