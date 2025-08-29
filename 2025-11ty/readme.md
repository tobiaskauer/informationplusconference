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


### Future work

1. Create data file and output for the program
2. Build exhibition pages with next/prev nav. This content with be in markdown files with custon YAML metadata

