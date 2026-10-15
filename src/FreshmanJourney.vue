<script setup>
defineProps({ current: { type: String, required: true } });
defineEmits(["navigate"]);
const steps = [
  { view: "register", label: "填写报名", detail: "核对后提交资料" },
  { view: "status", label: "查询进度", detail: "留意面试与结果" },
];
</script>
<template>
  <nav class="freshman-journey" aria-label="报名流程" data-freshman-journey>
    <ol>
      <li v-for="(step, index) in steps" :key="step.view">
        <button
          type="button"
          :class="{ current: current === step.view }"
          :aria-current="current === step.view ? 'step' : undefined"
          @click="$emit('navigate', step.view)"
        >
          <span class="journey-number" aria-hidden="true">{{ index + 1 }}</span>
          <span
            ><strong>{{ step.label }}</strong
            ><small>{{ step.detail }}</small></span
          >
        </button>
      </li>
    </ol>
  </nav>
</template>
