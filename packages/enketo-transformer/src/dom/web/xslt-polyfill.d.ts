// OC-28872: xslt-polyfill ships no types. It is loaded for its side effects;
// a bundler may map it to a loader whose default export loads it.
declare module 'xslt-polyfill' {
    const load: unknown;
    export default load;
}
