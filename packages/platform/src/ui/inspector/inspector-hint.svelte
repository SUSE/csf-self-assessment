<script lang="ts">
  // The rail with nothing to read: one line naming what to click. It is a real
  // subject rather than an empty state, because a screen where nothing is
  // inspectable yet still owes the reader that sentence — and stating it as data
  // (a `hint` subject) is what keeps the page's copy out of the panel's markup.
  type Props = {
    text: string;
  };
  let { text }: Props = $props();
</script>

<p class="p-1 text-xs text-muted-foreground">{text}</p>
