/**
 * I18N ENGINE
 * 
 * Translates DOM elements with `data-i18n` attributes based on the current language state.
 */

const PhoneI18n = (() => {
  
  function getNestedTranslation(dict, path) {
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : null, dict);
  }

  function translateDOM(language = 'en') {
    if (typeof PhoneI18nDict === 'undefined') return;
    
    const dict = PhoneI18nDict[language] || PhoneI18nDict['en'];
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = getNestedTranslation(dict, key);
      
      if (translation) {
        // Handle placeholders if needed
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translation;
        } else if (el.hasAttribute('title') && !el.textContent.trim()) {
          // If it's an icon button with a title but no text
          el.title = translation;
          el.setAttribute('aria-label', translation);
        } else {
          el.textContent = translation;
        }
      }
    });

    // Handle tooltips/titles specifically for sigil buttons
    const sigils = document.querySelectorAll('.sigil-btn[data-i18n-title]');
    sigils.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = getNestedTranslation(dict, key);
      if (translation) {
        el.title = translation;
        el.setAttribute('aria-label', translation);
      }
    });
  }

  return { translateDOM };
})();

// Dual-module support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneI18n;
} else {
  window.PhoneI18n = PhoneI18n;
}
