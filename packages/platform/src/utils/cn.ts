import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The shadcn class-merge helper: compose conditional classes (clsx) and resolve
// Tailwind conflicts last-wins (tailwind-merge). DOM-free — safe for any layer.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The shadcn-svelte element-ref helper: adds a `bind:this` target to a
// component's prop type. Type-only, so this stays DOM-free at runtime.
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

// The shadcn-svelte childless-props helper: a component that renders its own
// body drops `children` from the attributes it forwards.
export type WithoutChildren<T> = Omit<T, 'children'>;

// The same, for a bits-ui primitive that also offers `child` (the render-your-own
// -element escape hatch): a wrapper owning its body forwards neither.
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;
