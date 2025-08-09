# Welcome to InstaSky

InstaSky is a Instagram-inspired personal hompe page for anyone who:

* Uses the [Bluesky social network](https://bsky.app) and wants to support its growth.
* Has a spot on the web for a person home page, but doesn't want to build one from scratch.
* Exited META's properties (Facebook, Instagram, ...) due to META's absusive practices, but misses - or just likes - the Instagram experience.
* Prefers a media-rich experience over text-heavy microblogging.

![desktop](/assets/desktop.png)

## What does InstaSky do?

While there are a few projects that will bring your Bluesky feed to a web page, and some applications that will give you media-filtered views of your Bluesky content, InstaSky does both at once:

* Your own website (www.yourname.com) becomes a location to showcase your media posts.
* Supports AT Protocol growth with links back to Bluesky everywhere.
* Faithfully replicates the desktop Instagram profile experience, including infinite scroll.
* Delivers an elegant mobile, touch-friendly interface (whereas Instagram forced you to install their app).
* Can be easily and thoroughly customized. No obfuscated CSS, no limited CSS overrides.

<img src="/assets/iphone.png" width="450px">

## Installation and Usage

Using InstaSky assumes that you have a web server and a means to copy files to it. Ideally, you'll have a domain pointed to it. Once those things are true, just follow a few easy steps:

1. Clone this repository.
2. Edit /src/script.js in your favorite text editor. The firset section is CONFIGURATION. 
    - Set HANDLE to be your Bluesky handle, without the @.
    - Set AUTHOR_ONLY to be true (default) or false. True displays only posts that you created. false will include replies and reposts that include media.
3. Copy the three files under /src (index.html, script.js, styles.css) into your web server's document root.

That's it!

## Future  Ideas

InstaSky is a thin veneer to Bluesky. That's by design, as one of its goals is to drive traffic and usage to Bluesky. In the future, I plan to:

* Add a dark theme
* Add Lightbox support for on-page image and video viewing (maybe)
* Expose RSS feeds for Bluesky users in some clever way
* Collaborate with one of the projects bringing media-rich experiences to ATproto, like [Spark.](https://sprk.so/)

Your ideas are always welcome. Please open an issue or a PR. 

## Acknowledgements

- Thanks to [ChatGPT](https://chatgpt.com) and [Claude.AI](https://Claude.AI) for contributing most of the Bluesky API interfaces and fixes to my CSS.
- Thanks to [Remix Icon](https://remixicon.com/) for the elegant SVG for icons, enabling a binary-free initial distribution.

Enjoy your media-rich home page while supporting a protocol that keeps you in control of your data!