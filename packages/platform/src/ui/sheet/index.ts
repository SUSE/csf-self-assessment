import { Dialog as DialogPrimitive } from 'bits-ui';
import Overlay from './sheet-overlay.svelte';
import Content from './sheet-content.svelte';
import Header from './sheet-header.svelte';
import Title from './sheet-title.svelte';

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;
const Portal = DialogPrimitive.Portal;
const Close = DialogPrimitive.Close;

export {
  Root,
  Trigger,
  Portal,
  Close,
  Overlay,
  Content,
  Header,
  Title,
  //
  Root as Sheet,
  Trigger as SheetTrigger,
  Portal as SheetPortal,
  Close as SheetClose,
  Overlay as SheetOverlay,
  Content as SheetContent,
  Header as SheetHeader,
  Title as SheetTitle,
};
