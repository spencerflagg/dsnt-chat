<script>
  // Imports: Library and Svelte Store
  import { onMount } from 'svelte';

  // Local Variables
  let title = null;
  let description = null;
  let thumbnail = null;
  let publishDate = null;
  let isLoading = true;
  let isError = false;
  let urlAbbr;
  let imageLoaded = false;
  let imageError = false;
  let showContent = true;
  
  const threshold = 100;
  const buffer = 0; // Adjust this value as needed
  
  export let scrollPosition;
  export let url;

  // Reactive Statements
  $: {
    if (scrollPosition <= threshold - buffer) {
      showContent = true;
    } else if (scrollPosition >= threshold + buffer) {
      showContent = false;
    }
  }
  $: {
    const cleanedUrl = typeof url === 'string' ? url.replace(/^https?:\/\//, '') : '';
    urlAbbr = cleanedUrl.length > 20 ? cleanedUrl.substring(0, 20) + '...' : cleanedUrl;
  }
  $: fetchMetaData(url);

  // Lifecycle Methods
  onMount(async () => {
    fetchMetaData(url);
  });

  // Helper Functions
  async function fetchMetaData(url){
    isError = false;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Couldn't fetch URL");
      }
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      // Check multiple possible meta tags for each property
      const titleTags = ['title', 'og:title', 'twitter:title'];
      const descriptionTags = ['description', 'og:description', 'twitter:description'];
      const thumbnailTags = ['image', 'og:image', 'twitter:image'];
      const publishDateTags = ['article:published_time', 'published_time', 'date'];
      
      title = getMetaContent(doc, titleTags);
      description = getMetaContent(doc, descriptionTags);
      thumbnail = getMetaContent(doc, thumbnailTags);
      publishDate = getMetaContent(doc, publishDateTags);
    } catch (error) {
      isError = true;
      console.log('Error fetching URL:', error);
    } finally {
      isLoading = false;
    }
  }
  function getMetaContent(doc, tagNames) {
    for (const tagName of tagNames) {
      const element = doc.querySelector(`meta[name="${tagName}"], meta[property="${tagName}"]`);
      if (element && element.content) {
        return element.content;
      }
    }
    return null;
  }

  // Event Handlers and UI Logic
  function onImageLoad() {
    imageLoaded = true;
  }
  function onImageError() {
    imageError = true;
  }

</script>
{#if isLoading}
<h1 class="{showContent ? '' : 'content--shown'}">{urlAbbr}</h1>
<div class="metadata__content{showContent ? '' : ' content--hidden'}">
  <p>Loading...</p>
</div>
{:else if isError}
<h1 class="{showContent ? '' : 'content--shown'}">{urlAbbr}</h1>
<div class="metadata__content{showContent ? '' : ' content--hidden'}">
  <p>There was a problem displaying info from this website.</p>
</div>
{:else if !title && !description && !thumbnail && !publishDate}
<h1 class="{showContent ? '' : 'content--shown'}">{urlAbbr}</h1>
<div class="metadata__content{showContent ? '' : ' content--hidden'}">
  <p>No data found.</p>
</div>
{:else}
  {#if title}
        <h1 class="{showContent ? '' : 'content--shown'}">{title}</h1>
  {/if}
  <div class="metadata__content{showContent ? '' : ' content--hidden'}">
    <div class="metadata__text">
      <a href="{url}" target="_blank" rel="noreferrer">{urlAbbr}</a>
      {#if description}
        <p>{description}</p>
      {/if}
      {#if publishDate}
        <p>Published on: {new Date(publishDate).toLocaleDateString()}</p>
      {/if}
    </div>
    <div class="metadata__thumbnail">
      {#if thumbnail}
        <img src="{thumbnail}" alt="Thumbnail for {title}" on:load={onImageLoad} on:error={onImageError} />
        <!-- {imageLoaded}
        {imageError} -->
      {/if}
    </div>
  </div>
{/if}


<style>

h1 {
  /* font-size: 2.5rem; */
  color: var(--c-3);
  font-size: 1.5rem;
  color: var(--c-3);
  font-weight: 500;
  margin: -1rem -1rem 0 -1rem;
  padding: 1rem 1rem 1px 1rem;
  background: linear-gradient(to bottom, #381100 0%, #3f1300 100%);
  z-index: 1;
}

h1.content--shown{
  box-shadow: #3f1300 0 0 10px 10px;
}

a{
  color: var(--c-3);
}

a:visited{
  color: var(--c-3);
}

a:hover{
  color: var(--c-bright);
}

p {
  color: var(--c-3);
  max-width: 60ch;
  overflow: hidden;
  overflow-wrap: anywhere;
}



.metadata__content {
  display: flex;
  gap: 1rem;
  transition: all .2s ease-in-out;
  opacity: 1;
}

.metadata__content.content--hidden {
  overflow:hidden;
  opacity: 0;
  transform: translateY(-300px);
}

.metadata__text {
  flex-grow: 1;
}

.metadata__thumbnail {
  flex-grow:0;
  width: fit-content;
  display: flex;
  align-items: center;
  
}

img{
  max-height: 6rem;
  outline: 1px solid rgba(255, 255, 255, .5);
  border-radius: .5rem;
}
</style>