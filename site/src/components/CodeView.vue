<script setup lang="ts">
import { ref } from 'vue'
import { copyText } from '../copy'

const props = defineProps<{ source: DemoSource; label: string }>()

const copied = ref(false)
async function copy() {
  const text = props.source.lines.map((line) => line.map(([t]) => t).join('')).join('\n')
  copied.value = await copyText(text)
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div class="code">
    <button class="code-copy" type="button" @click="copy">
      {{ copied ? 'Copied' : 'Copy' }}
    </button>
    <!-- One text span per token: colours come from build-time highlighting, the text is escaped. -->
    <pre
      tabindex="0"
      :aria-label="label"
    ><code><template v-for="(line, i) in source.lines" :key="i"><span v-for="([text, style], j) in line" :key="j" :style="source.styles[style]">{{ text }}</span>{{ '\n' }}</template></code></pre>
  </div>
</template>
