const markdownIt = require("markdown-it");
const markdownItAttrs = require("markdown-it-attrs");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Custom markdown config
  let options = {
    html: true,
    linkify: true
  };
  let markdownLib = markdownIt(options).use(markdownItAttrs);
  eleventyConfig.setLibrary("md", markdownLib);

  // Collection for exhibits in the exhibition
  eleventyConfig.addCollection("exhibition", function(collectionApi) {
    return collectionApi.getFilteredByTag("exhibit");
  });

  // Layout alias
  eleventyConfig.addLayoutAlias('post', './source/_layouts/layout_default.njk');

  // Passthrough copy for assets
  eleventyConfig.addPassthroughCopy("./source/styles/fonts/");
  eleventyConfig.addPassthroughCopy("./source/images/");
  eleventyConfig.addPassthroughCopy("./source/scripts/");
  eleventyConfig.addPassthroughCopy("./source/downloads/");

  // Filters
  eleventyConfig.addFilter("dateDisplay", (dateString) => {
    return DateTime.fromISO(dateString).toFormat("cccc, LLL dd");
  });
  eleventyConfig.addFilter("timeDisplay", (timeString) => {
    if (!timeString) return "";
    return DateTime.fromFormat(timeString, "HH:mm:ss").toFormat("hh:mm a");
  });
  eleventyConfig.addFilter("sortByDateTime", (arr) => {
    return arr.slice().sort((a, b) => {
      const aDateTime = `${a.date}T${a.start_time}`;
      const bDateTime = `${b.date}T${b.start_time}`;
      return aDateTime.localeCompare(bDateTime);
    });
  });
  eleventyConfig.addFilter("sortExhibits", function(collection) {
    return collection.sort((a, b) => {
      const typeComparison = a.data.type.localeCompare(b.data.type);
      if (typeComparison !== 0) {
        return typeComparison;
      }
      return a.data.title.localeCompare(b.data.title);
    });
  });
  eleventyConfig.addFilter("markdownify", function (value) {
    if (!value) return "";
    return markdownLib.render(value);
  });  

  // Watch target for styles
  eleventyConfig.addWatchTarget("./source/styles/");

  // Return config object
  return {
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dir: {
      input: "source",
      output: "../2025",
      includes: "_layouts/_partials",
      layouts: "_layouts",
      data: "_data",
    },
    pathPrefix: "/2025/"
  };
};