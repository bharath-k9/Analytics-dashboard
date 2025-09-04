declare module 'topojson-client' {
  export function feature(topology: any, obj: any): any
  export function mesh(topology: any, obj: any, filter?: (a: any, b: any) => boolean): any
  export function neighbors(objects: any): any
}
