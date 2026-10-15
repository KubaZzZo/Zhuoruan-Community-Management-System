<script setup>
defineProps({ record: { type: Object, required: true } });
defineEmits(["copy", "download"]);
</script>

<template>
  <article class="recruitment-receipt" data-recruitment-receipt>
    <div class="receipt-heading">
      <span class="receipt-mark" aria-hidden="true">✓</span>
      <div>
        <p class="eyebrow">报名回执</p>
        <h2>报名资料已提交</h2>
      </div>
    </div>
    <p v-if="record.name || record.preferredDepartment" class="receipt-identity">
      {{ record.name }}<span v-if="record.preferredDepartment"> · {{ record.preferredDepartment }}</span>
    </p>
    <dl class="receipt-code-row">
      <div>
        <dt>学号</dt>
        <dd>{{ record.studentId }}</dd>
      </div>
      <div>
        <dt>手机号</dt>
        <dd class="submit-id">{{ record.phone }}</dd>
      </div>
    </dl>
    <p>之后用这两项查询进度。请保存回执，妥善保管个人联系方式。</p>
    <div class="receipt-actions">
      <button type="button" class="secondary-action" data-copy-receipt @click="$emit('copy')">复制查询信息</button>
      <button type="button" class="secondary-action" data-download-receipt @click="$emit('download')">
        下载报名回执
      </button>
    </div>
  </article>
</template>
