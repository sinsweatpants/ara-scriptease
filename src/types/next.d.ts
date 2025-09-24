declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: unknown;
  }
}

declare module 'next/font/google' {
  interface FontDefinition {
    className: string;
    style?: string;
    variable?: string;
  }

  export function Geist(options?: Record<string, unknown>): FontDefinition;
  export function Geist_Mono(options?: Record<string, unknown>): FontDefinition;
}

declare module 'next/image' {
  import type { FC, ImgHTMLAttributes } from 'react';

  interface NextImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    fill?: boolean;
    priority?: boolean;
    quality?: number | string;
  }

  const Image: FC<NextImageProps>;
  export default Image;
}
