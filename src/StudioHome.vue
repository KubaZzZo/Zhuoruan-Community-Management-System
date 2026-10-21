<script setup>
import { computed } from "vue";
import StudioWorkspace from "./StudioWorkspace.vue";
import { useHeroParallax } from "./useHeroParallax.js";
import { DEPARTMENT_GUIDES, GROWTH_STEPS } from "./studioContent.js";

const props = defineProps({
  policy: { type: Object, required: true },
  policyWindow: { type: String, default: "" },
  profiles: { type: Array, required: true },
  faqs: { type: Array, required: true },
});
const displayProfiles = computed(() => [...props.profiles].sort((a, b) => Number(b.direct) - Number(a.direct)));
const { heroElement, handleHeroPointer, resetHeroPointer, stopHeroMotion } = useHeroParallax();

defineEmits(["navigate", "department", "status", "section"]);
</script>

<template>
  <main class="freshman-home studio-home">
    <section
      ref="heroElement"
      class="hero studio-hero"
      aria-labelledby="page-title"
      @pointermove="handleHeroPointer"
      @pointerleave="resetHeroPointer"
      @pointercancel="stopHeroMotion"
      @focusin="stopHeroMotion"
    >
      <div class="studio-masthead" aria-hidden="true">
        <span>ZHUORUAN</span>
        <div>
          <span>STUDIO</span>
          <p>保持好奇 · 一起创造<br />LEARN. BUILD. TOGETHER.</p>
        </div>
      </div>
      <div class="studio-hero-bottom">
        <div class="hero-content">
          <p class="studio-kicker">HELLO, NEW BUILDER_</p>
          <p class="studio-school">江苏师范大学科文学院 · 卓软信息工作室</p>
          <h1 id="page-title" tabindex="-1">大学的第一份作品，<br /><span>从你的兴趣开始。</span></h1>
          <p class="hero-copy">
            写代码、解难题、做项目，也让好想法被看见。<br
              class="studio-desktop-break"
            />找到你的伙伴，把“我想试试”变成“我们做到了”。
          </p>
          <div class="hero-actions">
            <button class="primary-action" type="button" @click="$emit('navigate', 'register')">
              {{ policy.isOpen ? "加入卓软" : "了解报名要求" }} <span aria-hidden="true">↗</span>
            </button>
            <button class="studio-text-action" type="button" @click="$emit('section', 'works-title')">
              探索我们的作品 <span aria-hidden="true">↓</span>
            </button>
          </div>
          <p class="hero-returning">
            已提交报名？<a href="#status" @click.prevent="$emit('status')">查看我的进度 ↗</a>
          </p>
        </div>
        <StudioWorkspace />
      </div>
    </section>

    <div class="studio-season-strip" aria-label="当前招新状态">
      <div>
        <span class="studio-live-dot" :class="{ 'is-closed': !policy.isOpen }" aria-hidden="true"></span
        ><strong>{{ policy.season }} 招新季</strong><span>{{ policy.isOpen ? "正在接受报名" : "当前未开放" }}</span>
      </div>
      <p v-if="policyWindow">{{ policyWindow }}（北京时间）</p>
      <p v-else>{{ policy.isOpen ? "选择一个方向，从这里认识卓软。" : policy.message }}</p>
      <button type="button" @click="$emit('section', 'join-title')">
        了解招新流程 <span aria-hidden="true">↗</span>
      </button>
    </div>

    <section class="studio-section studio-works" aria-labelledby="works-title">
      <div class="studio-section-heading">
        <div>
          <p class="studio-section-index">01 / SELECTED WORK</p>
          <h2 id="works-title" tabindex="-1">把想法，做成作品。</h2>
        </div>
        <p>从身边的真实需求出发。<br />一份能被使用的作品，就是很好的起点。</p>
      </div>
      <article class="studio-featured-project" data-studio-project>
        <div class="studio-project-preview">
          <div class="studio-project-address">
            <span>PROJECT_01 / WEB</span><span>enrollment.zhuoruan.xyz</span><span aria-hidden="true">— □ ×</span>
          </div>
          <img
            src="/studio-recruitment.png"
            alt="卓软招新系统的报名页面，展示填写进度与基本信息表单；截图未包含个人资料"
            width="1100"
            height="860"
            loading="lazy"
          />
        </div>
        <div class="studio-project-content">
          <p class="studio-project-label">正在使用的作品 / WEB</p>
          <h3>卓软招新系统</h3>
          <p>
            你正在访问的网站。把部门介绍、在线报名、审核和进度查询串联起来，让新生少一点困惑，让工作人员更方便协作。
          </p>
          <ul class="studio-tags" aria-label="项目特点">
            <li>Vue 3</li>
            <li>Node.js</li>
            <li>MySQL</li>
            <li>团队协作</li>
          </ul>
          <button class="studio-text-action" type="button" @click="$emit('navigate', 'register')">
            体验报名页面 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </article>
      <div class="studio-explore-grid">
        <article class="studio-explore-card studio-explore-algorithm">
          <div class="studio-mini-art" aria-hidden="true">
            <svg viewBox="0 0 240 100">
              <path d="M16 82H224M16 16V82" stroke="currentColor" opacity=".25" fill="none" />
              <path d="m25 67 38-16 33 8 39-32 37 9 41-23" fill="none" stroke="currentColor" stroke-width="3" />
              <circle cx="135" cy="27" r="6" fill="currentColor" />
              <circle cx="213" cy="13" r="6" fill="currentColor" /></svg
            ><span>input → explore → insight</span>
          </div>
          <div>
            <p class="studio-project-label">可尝试的练习方向 / ALGORITHM & AI</p>
            <h3>让数据说话，让思路跑起来。</h3>
            <p>从一道算法题、一份数据集开始，尝试把解题过程做成可视化，或完成一个小小的数据分析实验。</p>
            <button class="studio-text-action" type="button" @click="$emit('department', '数据算法部')">
              认识数据算法部 <span aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
        <article class="studio-explore-card studio-explore-campus">
          <div class="studio-mini-art studio-campus-art" aria-hidden="true">
            <span class="studio-mini-tile">idea.</span><span class="studio-mini-tile">build.</span
            ><span class="studio-mini-tile">share.</span>
          </div>
          <div>
            <p class="studio-project-label">可尝试的练习方向 / CAMPUS & COMMUNITY</p>
            <h3>让校园里的小事，变得更好。</h3>
            <p>一个实用工具、一张活动海报、一份清晰的策划案。技术与表达，都可以成为解决问题的方式。</p>
            <button class="studio-text-action" type="button" @click="$emit('section', 'departments-title')">
              寻找适合我的方向 <span aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="studio-section studio-directions" aria-labelledby="departments-title">
      <div class="studio-section-heading">
        <div>
          <p class="studio-section-index">02 / FIND YOUR PEOPLE</p>
          <h2 id="departments-title" tabindex="-1">不同的热爱，<br />都能找到自己的位置。</h2>
        </div>
        <p>三个部门可直接报名，实干青年部仅内部调剂。<br />先看看你喜欢做什么，再选择一个意向部门。</p>
      </div>
      <div class="department-grid studio-department-grid">
        <article v-for="(department, index) in displayProfiles" :key="department.name" class="department-card">
          <button type="button" @click="$emit('department', department.name)">
            <div class="studio-panel-bar" aria-hidden="true">
              <span>DEPARTMENT_0{{ index + 1 }}</span
              ><span>— □ ×</span>
            </div>
            <div class="department-card-top">
              <span class="department-index">0{{ index + 1 }}</span
              ><span class="department-access">{{ department.direct ? "可直接报名" : "仅内部调剂" }}</span>
            </div>
            <h3>{{ department.name }}</h3>
            <p class="department-direction">{{ DEPARTMENT_GUIDES[department.name].intro }}</p>
            <p>{{ DEPARTMENT_GUIDES[department.name].interests }}</p>
            <ul class="studio-tags">
              <li v-for="tag in DEPARTMENT_GUIDES[department.name].tags" :key="tag">{{ tag }}</li>
            </ul>
            <strong>看看如何开始 <span aria-hidden="true">↗</span></strong>
          </button>
        </article>
      </div>
    </section>

    <section class="studio-section studio-about" aria-labelledby="about-title">
      <p class="studio-section-index">THE STUDIO / OUR MISSION</p>
      <div>
        <h2 id="about-title">因为兴趣相遇，<br />在实践里一起成长。</h2>
        <p>
          卓软是一个围绕技术、项目和协作展开的学生工作室。有人钻研算法，有人开发应用，也有人让活动和想法被更多人看见。
        </p>
        <p>你不必已经有一份漂亮的作品集。带着真实的兴趣与想学的方向，先认识我们，再决定从哪里开始。</p>
      </div>
      <div class="studio-about-mark" aria-hidden="true">
        <span>LEARN.</span><span>BUILD.</span><span>TOGETHER<span class="studio-green-dot">.</span></span>
      </div>
    </section>

    <section class="studio-section studio-growth" aria-labelledby="growth-title">
      <div class="studio-section-heading">
        <div>
          <p class="studio-section-index">03 / YOUR NEXT CHAPTER</p>
          <h2 id="growth-title">一个人开始，<br />和一群人走得更远。</h2>
        </div>
        <p>你可以这样开启自己的成长。<br />先做一点，再多懂一点。</p>
      </div>
      <div class="studio-growth-list">
        <article v-for="(step, index) in GROWTH_STEPS" :key="step.word">
          <span class="studio-growth-number">0{{ index + 1 }}</span>
          <div class="studio-growth-word">{{ step.word }}<span>.</span></div>
          <div>
            <p class="studio-project-label">{{ step.detail }}</p>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="studio-section studio-join" aria-labelledby="join-title">
      <div class="studio-join-intro">
        <p class="studio-section-index">04 / JOIN ZHUORUAN</p>
        <h2 id="join-title" tabindex="-1">下一份作品，<br />一起完成。</h2>
        <p>准备好学号、联系方式和一张清晰证件照。<br />奖项和任职经历可以留空，告诉我们你想学什么。</p>
        <button class="primary-action" type="button" @click="$emit('navigate', 'register')">
          {{ policy.isOpen ? "填写我的报名表" : "先填写报名草稿" }} <span aria-hidden="true">↗</span>
        </button>
        <p v-if="policyWindow" class="studio-join-schedule">{{ policyWindow }}（北京时间）</p>
        <p v-if="!policy.isOpen" class="studio-join-schedule">{{ policy.message }} 开放后再正式提交。</p>
      </div>
      <ol class="studio-join-steps">
        <li>
          <span>01</span>
          <div>
            <h3>找到你的方向</h3>
            <p>了解部门与学习建议，选择一个意向部门。</p>
            <button type="button" @click="$emit('section', 'departments-title')">
              查看部门 <span aria-hidden="true">↗</span>
            </button>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <h3>填写、核对，再提交</h3>
            <p>如实填写基本资料和兴趣，核对后提交；请保存报名回执。</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <h3>查看进度，留意通知</h3>
            <p>用学号和报名手机号查询。面试与后续安排，以工作人员通知为准。</p>
            <a href="#status" @click.prevent="$emit('status')">查询我的进度 <span aria-hidden="true">↗</span></a>
          </div>
        </li>
      </ol>
    </section>

    <section class="studio-section freshman-faq studio-faq" aria-labelledby="faq-title">
      <div>
        <p class="studio-section-index">A FEW THINGS TO KNOW</p>
        <h2 id="faq-title">有点好奇，<br />也有点疑问？</h2>
        <p>第一次报名，也能心里有数。</p>
      </div>
      <div class="faq-list">
        <details v-for="faq in faqs" :key="faq.question">
          <summary>{{ faq.question }}<span aria-hidden="true">+</span></summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
    </section>
    <div class="studio-signoff" aria-hidden="true">STAY CURIOUS. BUILD TOGETHER.<span>卓软 · 从兴趣开始</span></div>
  </main>
</template>
