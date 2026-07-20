// Work around for XRay vision in firefox
// See: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#xray_vision_in_firefox
//
interface Window {
  wrappedJSObject?: typeof globalThis;
}

interface URLSearchParams {
  wrappedJSObject?: URLSearchParams;
}
