<script>
    import Readme from '$lib/README.md';
</script>

<svelte:head>
  <title>About DiSseNT</title>
  <meta property="og:url" content="https://dsnt.chat/about" />
  <meta name="description" content="The web's comment section." />
  <meta
    property="og:description"
    content="The web's comment section."
  />
</svelte:head>

<section class="nav">
    <nav>
      <ul>
        <li><a href='/'>👈️ back</a></li>
      </ul>
    </nav>
  </section>

<div class="page">
    <div class="sheet content--scrolling">
        <Readme />
    </div>
</div>

<style>

section.nav{
    font-family: Work Sans, sans-serif;
    position: fixed;
    top: 1rem;
    left: 1rem;
  }

.page {
    font-family: Work Sans, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sheet{
    font-family: Work Sans, sans-serif;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  width: 566px;
  overflow-y: auto;
  background-color: rgb(56, 17, 0, 0.2);
  padding: 1rem;
  gap: 1rem;
}

</style>