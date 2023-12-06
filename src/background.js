// background script, data from content script:
//
//  {
//      behavior:   'save',
//      title:      'the website title',       /* String */
//      url:        'https://the.website/url', /* String */
//      val:        'the text in textarea',    /* String */
//      id:         'the No. of textarea',     /* String */
//      type:       'is the textarea WYSIWYG', /* String, [WYSIWYG|txt] */
//      sessionKey: 'the timeing open page'    /* String */
//  }

(async () => {
    await ta_database.init();
    ta_bg.init();
})();

