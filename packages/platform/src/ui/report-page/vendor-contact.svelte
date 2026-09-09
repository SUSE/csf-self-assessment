<script lang="ts">
  import type { NamedRecommender } from '../../report';

  type Props = { contact: NonNullable<NamedRecommender['contact']> };

  let { contact }: Props = $props();
</script>

<a
  data-report-contact
  href={contact.url}
  target="_blank"
  rel="noreferrer noopener"
  class="block w-fit text-sm font-medium text-foreground underline decoration-muted-foreground underline-offset-2"
>
  {contact.label}
</a>
<span data-report-contact-url class="block break-all text-xs text-muted-foreground">{contact.url}</span>
