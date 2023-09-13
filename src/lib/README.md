# What is DiSseNT?
[DiSseNT](https://dsnt.chat) is my attempt at ressurecting a valuable [project](https://github.com/gab-ai-inc/gab-dissenter-extension/issues/117) to enable truely trustless and free commentary on the web. DiSseNT is a web app built on [NOSTR](https://github.com/nostr-protocol/nostr), and based on [Nostri.chat](https://github.com/pablof7z/nostr-chat-widget), that [associates](#how-does-it-work) a set of NOSTR messages with a given URL.

This standalone web app is a first step - browser plugins and native apps will be the next (and perhaps more important) steps.

# But why?
It's valuable to have public debate on important issues. In the web-centric world that we live in, most important issues are represented by urls (a news article on CNN, a post on X.com, a video on YouTube, etc) and consequently, much of that debate is going to happen online and refer directly to those urls.

**Also** in the world we live in, most of that debate is tightly controlled by third parties. Most public commentary is hosted on servers owned by the likes of X.com, Facebook, YouTube and Reddit. Commentary on press articles and blogs is frequently stored on Disqus servers or Medium servers. Even alternative media outlets like Substack control their own commentary. With this control, necessarily (and perhaps understandably) comes censorship. With this censorship, the effectiveness of the public forum to suss out truth is diminished.

The goal of DiSseNT is to be a universal comment section for the web. The commentary will be controlled by no one, stored everywhere and nowhere, and tied [*](#archival)forever to the source material.


# How do I use it?
1. In the top bar, type the url of a real webpage and hit enter, or paste a url.
    - If the url represents a real page, the title of the page and other meta data should appear.
    - If there are comments [associated](#how-does-it-work) with this page on NOSTR, they should appear.
1. Type a comment and then submit it by clicking send, or hitting enter.
    - Hold control while hitting enter to get a new line.

<h1 id="how-does-it-work">How does it work?</h1>

At the moment, DiSsenT is fundamentally a fork of [Nostri.chat](https://github.com/pablof7z/nostr-chat-widget), an in-page support chat widget designed by Pablof7z, with trivial cosmetic changes, and one important functional change:

> All chats are created with "GROUP" as the `chatType` and a hex version of the provided url as the `chatId`.

# Roadmap
- [x] basic posting, associated with a url
- [x] display meta info 
- [ ] log out *(sept 2023)*
- [ ] reply to comments *(sept 2023)*
- [ ] zap comments *(sept 2023)*
- [ ] search comments *(fall 2023)*
- [ ] filter comments *(fall 2023)*
- [ ] sort comments
- [ ] cache comments
- [ ] relay picker
- [ ] **chromium extension**
- [ ] **PWA**
- [ ] view all dsnt'd urls
- [ ] search dsnt'd urls
- [ ] markdown comments
- [ ] automatic PDF storage of referenced webpages
- [ ] dark mode / light mode

# Supporting the Roadmap

<div class="support-links">
    <a class="btn" href='https://ko-fi.com/O4O1OZX1V' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=3' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
    <a class="btn" href="https://liberapay.com/spencer.flagg/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg"></a>
    <a class="btn btn--lightning" href="lightning:crimsonbird599@getalby.com" title="tip on the lightning network">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_21_2)">
            <mask id="mask0_21_2" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
            <path d="M16 0H0V16H16V0Z" fill="white"/>
            </mask>
            <g mask="url(#mask0_21_2)">
            <path d="M7.99902 16.0002C12.4173 16.0002 15.999 12.4185 15.999 8.00024C15.999 3.58197 12.4173 0.000244141 7.99902 0.000244141C3.58075 0.000244141 -0.000976562 3.58197 -0.000976562 8.00024C-0.000976562 12.4185 3.58075 16.0002 7.99902 16.0002Z" fill="#7B1AF7"/>
            <path d="M4.52538 8.17306L9.85872 3.5773C10.0911 3.42847 10.3126 3.5773 10.1708 3.83261L8.46865 7.18015H11.5041C11.5041 7.18015 11.9864 7.18015 11.5041 7.57732L6.25588 12.2014C5.88708 12.5135 5.63177 12.3433 5.88708 11.861L7.53247 8.59859H4.52538C4.52538 8.59859 4.04311 8.59859 4.52538 8.17306Z" fill="white"/>
            </g>
            </g>
            <defs>
            <clipPath id="clip0_21_2">
            <rect width="16" height="16" fill="white"/>
            </clipPath>
            </defs>
        </svg>
        Tip Lightning
    </a>
</div>

**Tip Monero**
```
84ENScA84suRz2pF1eptxS5FRfyYJcMX9VWrpfUQsUfiY8RVDFkfZCJEKHUQLNu5GJUiuwVtjJGSSiPnNX4PVz2dHPQe44T
```


<h1 id="archival">Archival</h1>

Ultimately I'd love to incorporate some automatic PDF storage of referenced webpages. Perhaps on IPFS?