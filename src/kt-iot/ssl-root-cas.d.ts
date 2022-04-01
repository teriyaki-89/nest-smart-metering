declare module 'ssl-root-cas' {
  function create(): string | Buffer | (string | Buffer)[] | undefined
}
