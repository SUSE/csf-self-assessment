import { Dialog as DialogPrimitive } from 'bits-ui';
import Overlay from './dialog-overlay.svelte';
import Content from './dialog-content.svelte';
import Header from './dialog-header.svelte';
import Title from './dialog-title.svelte';

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
  Root as Dialog,
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Close as DialogClose,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Header as DialogHeader,
  Title as DialogTitle,
};
