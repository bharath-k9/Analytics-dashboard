// minimal declarations so TS stops complaining about missing package types
declare module 'react-simple-maps' {
  import * as React from 'react'
  export const ComposableMap: React.ComponentType<any>
  export const Geographies: React.ComponentType<any>
  export const Geography: React.ComponentType<any>
  export const ZoomableGroup: React.ComponentType<any>
  export const Marker: React.ComponentType<any>
  export const Annotation: React.ComponentType<any>
  export const Sphere: React.ComponentType<any>
  export default {
    ComposableMap: ComposableMap,
    Geographies: Geographies,
    Geography: Geography,
    ZoomableGroup: ZoomableGroup,
    Marker: Marker,
    Annotation: Annotation,
    Sphere: Sphere
  }
}

