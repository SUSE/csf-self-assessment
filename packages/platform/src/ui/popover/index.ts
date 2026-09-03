import { Popover as PopoverPrimitive } from 'bits-ui';
import Content from './popover-content.svelte';

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Portal = PopoverPrimitive.Portal;
const Close = PopoverPrimitive.Close;

export {
  Root,
  Trigger,
  Portal,
  Close,
  Content,
  //
  Root as Popover,
  Trigger as PopoverTrigger,
  Portal as PopoverPortal,
  Close as PopoverClose,
  Content as PopoverContent,
};
