<template>
  <div class="studio-workspace" aria-hidden="true">
    <div class="studio-panel-bar"><span>WORKSPACE.EXE</span><span>— □ ×</span></div>
    <svg viewBox="0 0 660 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="workspace-dots" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".65" fill="currentColor" />
        </pattern>
      </defs>
      <g class="workspace-room" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path
          d="M14 273h632M50 272l45-56h465l50 56M95 216V43h465v173M95 43l64 43h337l64-43M159 86v130M496 86v130"
          opacity=".28"
        />
        <path d="M95 125h64M496 125h64M95 175h64M496 175h64M230 86V43M330 86V43M430 86V43" opacity=".2" />
      </g>
      <g class="workspace-desk" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m82 208 414-8 89 38-430 11Z" fill="white" />
        <path d="M155 249v34m396-45v45M101 214v54" />
        <rect x="212" y="98" width="164" height="105" rx="5" fill="white" />
        <rect x="222" y="108" width="144" height="79" rx="1" fill="url(#workspace-dots)" />
        <path d="M222 108h144v79H222Z" fill="white" fill-opacity=".8" />
        <path d="m250 137-13 11 13 11m85-22 13 11-13 11m-48 8 14-40" stroke-width="3" />
        <path d="M284 203v14m23-14v14m-36 2h49m-91 7 115-2 17 10-116 2Z" fill="white" />
        <path d="m238 230 100-2m-91 5 95-2" opacity=".5" />
        <rect x="408" y="146" width="76" height="66" rx="3" fill="url(#workspace-dots)" />
        <path d="M415 153h62v52h-62Z" fill="white" />
        <circle cx="446" cy="178" r="14" />
        <circle cx="446" cy="178" r="5" />
        <path d="M445 211v8m-14 1h28" />
        <path d="M153 183h28v29h-28Zm28 5h7a7 7 0 0 1 0 14h-7m-23-27c-7-8 8-10 0-17m14 15c-5-6 5-9 1-15" fill="white" />
        <path
          d="M527 196v-33m0 14c-19 1-20-18-20-18 18 0 20 18 20 18Zm0 8c20-2 21-20 21-20-18 0-21 20-21 20Z"
          fill="url(#workspace-dots)"
        />
        <path d="M515 196h25l-4 19h-17Z" fill="white" />
        <path d="M174 59h99v20h-99Z" fill="white" />
        <path d="M183 69h34m7 0h7m8 0h24" />
      </g>
      <g
        class="workspace-foreground"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="41" y="203" width="83" height="49" rx="12" fill="white" />
        <path d="M81 252v26m-27 7 27-7 29 7m-45-34-12 15m55-14 11 14" />
        <path d="M507 233c-6-17 1-30 18-30 16 0 25 10 25 25" fill="white" />
        <path d="M507 233h49l6 23h-62Z" fill="url(#workspace-dots)" />
        <path d="M530 257v24m-24 7 24-7 26 7" />
      </g>
      <g class="workspace-spark" fill="currentColor">
        <rect x="440" y="95" width="5" height="5" />
        <rect x="435" y="100" width="15" height="5" />
        <rect x="430" y="105" width="25" height="5" />
        <rect x="435" y="110" width="15" height="5" />
        <rect x="440" y="115" width="5" height="5" />
      </g>
    </svg>
    <div class="studio-workspace-caption"><span>IDEA → CODE → CREATE</span><span>● READY TO BUILD</span></div>
  </div>
</template>
