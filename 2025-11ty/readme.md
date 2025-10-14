# Read Me


### First run

Start a terminal in the `2025-11ty` directory, `% cd 2025-11ty`

Install node modules:

`% npm i`


### Run local development server

Start a terminal in the `2025-11ty` directory, `% cd 2025-11ty`

`% npm start`

You can view the site at <http://localhost:8080/2025/>


### Run the build process

You only need to do this if you haven't started a development server to compile your changes

`% npm run build`


### Content Files

All content in within `2025-11ty/source`

Page content will be in a HTML or MD file, e.g.:

-  `2025-11ty/source/index.md` = home page
-  `2025-11ty/source/about.html` = about page

Content is either in Markdown or a data file.

Data files are in `2025-11ty/source/_data`

- wcontact_nav.json = list of email addresses in the footer
- global.json = globl data strings, e.g. registration link and intro text in the headers
- organizers.csv = list of organizers
- past_events.json = list of past events and thumbnails
- social_nav.json = social media links
- more_nav.json = links in the 'more" naviagion menu 
- main_nav.json = link in the main navigation menu
- supporters.json = supporter links and logos


### Exhibitions

This is example of the meta data for exhibition items.

Items are sorted by the date column.

Layout is affected by adding the optional `class` attribute to images.
The classes are Bulma.css column classes. Valid options are:
- is-three-quarters
- is-two-thirds
- is-half
- is-one-third
- is-one-quarter
- is-full
- is-four-fifths
- is-three-fifths
- is-two-fifths
- is-one-fifth

```
---
title: "Exhibition Title"
layout: "exhibition_item.njk"
date: 2025-01-10
thumb: "/images/exhibition/_rembrandt_thumb.jpg"
contributors: 
- name: "Rembrandt van Rijn"
  bio: "Bio goes here ..."
images:
- src: /images/exhibition/_rembrandt_selfportrait.jpg
  alt: "Self Portrait"
  class: "is-one-third"
- src: /images/exhibition/_rembrandt_touch.jpg
  alt: "Touch"
  class: "is-one-third"
- src: /images/exhibition/_rembrandt_goodsamaritan.jpg
  alt: "The Good Samiritan"
  class: "is-one-third"
- src: /images/exhibition/_rembrandt_interior.jpg
  alt: "Interior"
  class: "is-two-thirds"

---
```

To add an exhibition link to `main_nav.json` add this to the JSON:

```
    {
        "url": "/exhibition/",
        "title": "Exhibition"
    },
```


### Future work

1. Create data file and output for the program
2. Build exhibition pages with next/prev nav. This content with be in markdown files with custon YAML metadata

