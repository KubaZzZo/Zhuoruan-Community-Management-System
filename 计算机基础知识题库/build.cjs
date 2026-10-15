const fs = require("node:fs");
const path = require("node:path");
const { conceptChoices, conceptBlanks } = require("./concept-data.cjs");

const root = __dirname;

function hashSeed(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seedText) {
  const random = mulberry32(hashSeed(seedText));
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const stems = new Set();

function addChoice(list, topic, stem, correct, distractors) {
  if (stems.has(stem)) throw new Error(`题干重复：${stem}`);
  const options = [correct, ...distractors];
  if (options.length !== 4 || new Set(options).size !== 4) throw new Error(`选项无效：${stem}`);
  const ordered = shuffle(options, stem);
  stems.add(stem);
  list.push({
    type: "choice",
    topic,
    stem,
    options: ordered,
    answer: "ABCD"[ordered.indexOf(correct)],
  });
}

function addBlank(list, topic, stem, answer) {
  if (stems.has(stem)) throw new Error(`题干重复：${stem}`);
  if (typeof stem !== "string" || stem.split("____").length !== 2) throw new Error(`填空题需要恰好一个空：${stem}`);
  if (answer === undefined || answer === null || String(answer).trim() === "") throw new Error(`缺少答案：${stem}`);
  stems.add(stem);
  list.push({ type: "blank", topic, stem, answer: String(answer) });
}

function others(items, index, count, textOf) {
  const used = new Set([textOf(items[index])]);
  const picked = [];
  let step = 1;
  while (picked.length < count) {
    const item = items[(index + step * 5) % items.length];
    const text = textOf(item);
    if (!used.has(text)) {
      used.add(text);
      picked.push(item);
    }
    step += 1;
    if (step > items.length * 2) throw new Error("干扰项不足");
  }
  return picked;
}

const abbreviations = [
  ["CPU", "中央处理器"],
  ["RAM", "随机存取存储器"],
  ["ROM", "只读存储器"],
  ["ALU", "算术逻辑单元"],
  ["CU", "控制器"],
  ["GPU", "图形处理器"],
  ["BIOS", "基本输入输出系统"],
  ["CMOS", "保存硬件配置的互补金属氧化物半导体存储器"],
  ["USB", "通用串行总线"],
  ["HDMI", "高清多媒体接口"],
  ["SSD", "固态硬盘"],
  ["HDD", "机械硬盘"],
  ["ASCII", "美国信息交换标准代码"],
  ["URL", "统一资源定位符"],
  ["HTTP", "超文本传输协议"],
  ["HTTPS", "安全超文本传输协议"],
  ["HTML", "超文本标记语言"],
  ["CSS", "层叠样式表"],
  ["SQL", "结构化查询语言"],
  ["DNS", "域名系统"],
  ["IP", "网际协议"],
  ["TCP", "传输控制协议"],
  ["UDP", "用户数据报协议"],
  ["FTP", "文件传输协议"],
  ["SMTP", "简单邮件传输协议"],
  ["POP3", "邮局协议第三版"],
  ["IMAP", "互联网消息访问协议"],
  ["DHCP", "动态主机配置协议"],
  ["NAT", "网络地址转换"],
  ["VPN", "虚拟专用网络"],
  ["LAN", "局域网"],
  ["WAN", "广域网"],
  ["MAN", "城域网"],
  ["OS", "操作系统"],
  ["API", "应用程序编程接口"],
  ["IDE", "集成开发环境"],
  ["GUI", "图形用户界面"],
  ["CLI", "命令行界面"],
  ["OCR", "光学字符识别"],
  ["CAD", "计算机辅助设计"],
  ["CAI", "计算机辅助教学"],
  ["CAM", "计算机辅助制造"],
  ["DBMS", "数据库管理系统"],
  ["DBA", "数据库管理员"],
  ["OOP", "面向对象程序设计"],
  ["JVM", "Java虚拟机"],
  ["JDK", "Java开发工具包"],
  ["JRE", "Java运行环境"],
  ["UEFI", "统一可扩展固件接口"],
  ["RAID", "独立磁盘冗余阵列"],
  ["DMA", "直接存储器访问"],
  ["PCIe", "高速串行扩展总线"],
  ["SATA", "串行高级技术附件接口"],
  ["NVMe", "非易失性存储器高速接口"],
  ["DDR", "双倍数据速率内存"],
  ["SRAM", "静态随机存取存储器"],
  ["DRAM", "动态随机存取存储器"],
  ["RISC", "精简指令集计算机"],
  ["CISC", "复杂指令集计算机"],
  ["FLOPS", "每秒浮点运算次数"],
  ["NTFS", "新技术文件系统"],
  ["FAT", "文件分配表"],
  ["MAC", "媒体访问控制地址"],
  ["ARP", "地址解析协议"],
  ["ICMP", "互联网控制报文协议"],
  ["SSID", "无线网络名称"],
  ["AES", "高级加密标准"],
  ["RSA", "RSA公钥加密算法"],
  ["MD5", "消息摘要算法第5版"],
  ["SHA", "安全散列算法"],
  ["CA", "证书颁发机构"],
  ["SSL", "安全套接字层"],
  ["TLS", "传输层安全协议"],
  ["DoS", "拒绝服务攻击"],
  ["DDoS", "分布式拒绝服务攻击"],
  ["IoT", "物联网"],
  ["AI", "人工智能"],
  ["GIS", "地理信息系统"],
  ["GPS", "全球定位系统"],
  ["ERP", "企业资源计划"],
  ["CRM", "客户关系管理"],
  ["OA", "办公自动化"],
  ["MIS", "管理信息系统"],
  ["ISP", "互联网服务提供商"],
  ["XML", "可扩展标记语言"],
  ["JSON", "JavaScript对象表示法"],
  ["WWW", "万维网"],
  ["NFC", "近场通信"],
  ["PDF", "便携式文档格式"],
  ["JPEG", "一种常用的有损图像压缩标准"],
  ["PNG", "一种支持透明的无损图像格式"],
  ["GIF", "图形交换格式"],
  ["OSI", "开放系统互连参考模型"],
  ["ISO", "国际标准化组织"],
  ["IEEE", "电气与电子工程师协会"],
  ["IETF", "互联网工程任务组"],
  ["W3C", "万维网联盟"],
  ["BGP", "边界网关协议"],
  ["OSPF", "开放最短路径优先协议"],
  ["RIP", "路由信息协议"],
  ["CIDR", "无类别域间路由"],
  ["IDS", "入侵检测系统"],
  ["IPS", "入侵防御系统"],
  ["PKI", "公钥基础设施"],
  ["DES", "数据加密标准"],
  ["DDL", "数据定义语言"],
  ["DML", "数据操纵语言"],
  ["DCL", "数据控制语言"],
  ["UML", "统一建模语言"],
  ["SDK", "软件开发工具包"],
  ["FIFO", "先进先出"],
  ["LIFO", "后进先出"],
  ["FCFS", "先来先服务"],
  ["LRU", "最近最少使用页面置换算法"],
  ["MMU", "内存管理单元"],
  ["MBR", "主引导记录"],
  ["GPT", "全局唯一标识分区表"],
  ["PID", "进程标识符"],
  ["EPROM", "可擦除可编程只读存储器"],
  ["EEPROM", "电可擦可编程只读存储器"],
  ["PROM", "可编程只读存储器"],
  ["SoC", "片上系统"],
  ["VR", "虚拟现实"],
  ["AR", "增强现实"],
  ["XSS", "跨站脚本攻击"],
  ["BBS", "电子公告板系统"],
  ["OLTP", "联机事务处理"],
  ["OLAP", "联机分析处理"],
  ["NoSQL", "非关系型数据库"],
  ["ACID", "原子性、一致性、隔离性和持久性"],
  ["CRUD", "增加、读取、更新和删除"],
  ["VCS", "版本控制系统"],
  ["QA", "质量保证"],
  ["GC", "垃圾回收"],
  ["PCB", "进程控制块"],
  ["IR", "指令寄存器"],
  ["PSW", "程序状态字"],
  ["ISA", "指令集架构"],
  ["POST", "上电自检"],
  ["IRQ", "中断请求"],
  ["SNMP", "简单网络管理协议"],
  ["NTP", "网络时间协议"],
  ["LDAP", "轻量目录访问协议"],
  ["RDP", "远程桌面协议"],
  ["SMB", "服务器消息块协议"],
  ["SSH", "安全外壳协议"],
  ["URI", "统一资源标识符"],
  ["UTF-8", "一种变长的Unicode编码"],
  ["MIDI", "乐器数字接口"],
  ["BMP", "位图文件格式"],
  ["WAV", "一种常见的波形音频格式"],
  ["MP3", "一种常见的有损音频压缩格式"],
];

const ports = [
  [20, "FTP数据连接"],
  [21, "FTP控制连接"],
  [22, "SSH"],
  [23, "Telnet"],
  [25, "SMTP"],
  [53, "DNS"],
  [67, "DHCP服务器"],
  [80, "HTTP"],
  [110, "POP3"],
  [123, "NTP"],
  [143, "IMAP"],
  [161, "SNMP"],
  [389, "LDAP"],
  [443, "HTTPS"],
  [445, "SMB"],
  [3306, "MySQL"],
  [3389, "远程桌面RDP"],
  [5432, "PostgreSQL"],
  [6379, "Redis"],
  [8080, "常见的HTTP备用端口"],
];

function hexByte(value) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function hanziCodes(area, position) {
  const nationalHigh = area + 0x20;
  const nationalLow = position + 0x20;
  return {
    national: `${hexByte(nationalHigh)}${hexByte(nationalLow)}H`,
    internal: `${hexByte(nationalHigh + 0x80)}${hexByte(nationalLow + 0x80)}H`,
  };
}

function wrongNumbers(correct, render) {
  const candidates = [correct + 1, Math.max(0, correct - 1), correct + 2, correct * 2, correct + 16];
  const texts = [];
  for (const candidate of candidates) {
    const text = render(candidate);
    if (text !== render(correct) && !texts.includes(text)) texts.push(text);
    if (texts.length === 3) return texts;
  }
  throw new Error(`无法为 ${correct} 生成干扰项`);
}

function buildGenerated() {
  const choices = [];
  const blanks = [];
  const meanings = new Set();
  const abbrs = new Set();
  for (const [abbr, meaning] of abbreviations) {
    if (abbrs.has(abbr) || meanings.has(meaning)) throw new Error(`缩写重复：${abbr} ${meaning}`);
    abbrs.add(abbr);
    meanings.add(meaning);
  }
  abbreviations.forEach((item, index) => {
    const [abbr, meaning] = item;
    const meaningOptions = others(abbreviations, index, 3, (entry) => entry[1]).map((entry) => entry[1]);
    addChoice(choices, "名词与缩写", `英文缩写“${abbr}”的中文含义是`, meaning, meaningOptions);
    addBlank(blanks, "名词与缩写", `${meaning}的英文缩写是____。`, abbr);
  });

  const binaryNumbers = [
    5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 18, 20, 24, 25, 27, 30, 31, 32, 40, 48, 50, 60, 63, 64, 100, 127, 128, 200, 255,
    256,
  ];
  for (const number of binaryNumbers) {
    const correct = number.toString(2);
    addChoice(
      choices,
      "数制与编码",
      `十进制数 ${number} 转换成二进制是`,
      correct,
      wrongNumbers(number, (value) => value.toString(2)),
    );
    addBlank(blanks, "数制与编码", `十进制数 ${number} 转换成二进制是____。`, correct);
  }

  for (const number of [10, 15, 16, 26, 31, 32, 79, 160, 255, 256, 512, 1023, 1024, 4095, 4096]) {
    const correct = number.toString(16).toUpperCase();
    addChoice(
      choices,
      "数制与编码",
      `十进制数 ${number} 转换成十六进制是`,
      `${correct}H`,
      wrongNumbers(number, (value) => `${value.toString(16).toUpperCase()}H`),
    );
    addBlank(blanks, "数制与编码", `十进制数 ${number} 转换成十六进制是____H。`, correct);
  }

  for (const number of [8, 9, 10, 15, 16, 20, 32, 63, 64, 100, 128, 255, 511, 512]) {
    addBlank(blanks, "数制与编码", `十进制数 ${number} 转换成八进制是____。`, number.toString(8));
    addChoice(
      choices,
      "数制与编码",
      `十进制数 ${number} 转换成八进制是`,
      number.toString(8),
      wrongNumbers(number, (value) => value.toString(8)),
    );
  }

  for (const pair of [
    [13, 11],
    [25, 18],
    [7, 9],
    [31, 14],
    [6, 15],
    [20, 21],
    [8, 8],
    [45, 19],
    [100, 28],
    [63, 64],
    [12, 3],
    [17, 46],
  ]) {
    const sum = pair[0] + pair[1];
    addChoice(
      choices,
      "数制与编码",
      `二进制 ${pair[0].toString(2)} 与 ${pair[1].toString(2)} 相加，结果的十进制值是`,
      String(sum),
      wrongNumbers(sum, (value) => String(value)),
    );
  }

  for (let power = 0; power <= 16; power += 1) {
    const value = 2 ** power;
    addBlank(blanks, "数制与编码", `2的${power}次方等于____。`, String(value));
    addChoice(
      choices,
      "数制与编码",
      `2的${power}次方等于`,
      String(value),
      wrongNumbers(value, (item) => String(item)),
    );
  }

  for (let value = -16; value <= -1; value += 1) {
    const bits = (value + 256).toString(2);
    addBlank(blanks, "数制与编码", `8位补码中，十进制 ${value} 表示为____。`, bits);
  }
  for (const value of [-128, -64, -32, -10, -5, -2, 0, 1, 127]) {
    const bits = value < 0 ? (value + 256).toString(2) : value.toString(2).padStart(8, "0");
    addChoice(
      choices,
      "数制与编码",
      `十进制 ${value} 的8位补码是`,
      bits,
      wrongNumbers(value < 0 ? value + 256 : value, (item) => (item & 255).toString(2).padStart(8, "0")),
    );
  }

  const ascii = [
    ["0", 48],
    ["A", 65],
    ["a", 97],
    ["B", 66],
    ["Z", 90],
    ["z", 122],
    ["9", 57],
  ];
  for (const [symbol, code] of ascii) {
    addBlank(blanks, "数制与编码", `标准ASCII中，字符“${symbol}”的十进制编码是____。`, String(code));
  }
  addChoice(choices, "数制与编码", "在标准ASCII中，小写字母比对应大写字母的编码值大", "32", ["1", "16", "26"]);
  addChoice(choices, "数制与编码", "标准ASCII基本码使用的二进制位数是", "7位", ["8位", "16位", "4位"]);
  addBlank(blanks, "数制与编码", "一个标准ASCII字符在存储时通常占用____个字节。", "1");

  const gates = [
    ["与", 1, 1, 1],
    ["与", 1, 0, 0],
    ["或", 1, 0, 1],
    ["或", 0, 0, 0],
    ["异或", 1, 0, 1],
    ["异或", 1, 1, 0],
    ["与非", 1, 1, 0],
    ["或非", 0, 0, 1],
  ];
  for (const [gate, left, right, result] of gates) {
    addBlank(blanks, "数制与编码", `逻辑${gate}运算中，${left}和${right}的结果是____。`, String(result));
    addChoice(choices, "数制与编码", `逻辑${gate}运算中，${left}与${right}的结果是`, String(result), [
      String(1 - result),
      "2",
      "无法由给定输入确定",
    ]);
  }

  for (const [area, position] of [
    [16, 1],
    [16, 2],
    [16, 3],
    [20, 1],
    [25, 10],
    [32, 1],
    [40, 8],
    [55, 20],
  ]) {
    const codes = hanziCodes(area, position);
    addBlank(blanks, "数制与编码", `GB2312中，区号${area}、位号${position}对应的汉字机内码是____。`, codes.internal);
    addChoice(choices, "数制与编码", `GB2312中，区号${area}、位号${position}对应的国标码是`, codes.national, [
      `${hexByte(area)}${hexByte(position)}H`,
      codes.internal,
      `${hexByte(area + 1)}${hexByte(position + 1)}H`,
    ]);
  }

  const imageCases = [
    [100, 100, 24],
    [200, 100, 24],
    [640, 480, 24],
    [800, 600, 24],
    [800, 600, 8],
    [1024, 768, 24],
    [1024, 768, 16],
    [320, 240, 24],
    [1280, 720, 24],
    [1920, 1080, 24],
  ];
  for (const [width, height, depth] of imageCases) {
    const bytes = (width * height * depth) / 8;
    addBlank(blanks, "多媒体", `一幅 ${width}×${height}、色深 ${depth} 位且未压缩的位图约占____字节。`, String(bytes));
    addChoice(
      choices,
      "多媒体",
      `一幅 ${width}×${height}、色深 ${depth} 位且未压缩的位图约占多少字节`,
      String(bytes),
      wrongNumbers(bytes, (value) => String(value)),
    );
  }

  const audioCases = [
    [44100, 16, 2, 1],
    [44100, 16, 2, 10],
    [22050, 16, 2, 1],
    [8000, 8, 1, 1],
    [8000, 16, 1, 60],
    [48000, 16, 2, 1],
  ];
  for (const [rate, bits, channels, seconds] of audioCases) {
    const bytes = rate * (bits / 8) * channels * seconds;
    addBlank(
      blanks,
      "多媒体",
      `采样率 ${rate} Hz、量化 ${bits} 位、${channels} 声道、时长 ${seconds} 秒的未压缩音频约占____字节。`,
      String(bytes),
    );
    addChoice(
      choices,
      "多媒体",
      `采样率 ${rate} Hz、量化 ${bits} 位、${channels} 声道、时长 ${seconds} 秒的未压缩音频约占多少字节`,
      String(bytes),
      wrongNumbers(bytes, (value) => String(value)),
    );
  }

  const ipCases = [
    ["8.8.8.8", "A类"],
    ["10.1.2.3", "A类"],
    ["126.0.0.1", "A类"],
    ["128.0.0.1", "B类"],
    ["172.16.5.4", "B类"],
    ["191.255.0.1", "B类"],
    ["192.0.2.1", "C类"],
    ["192.168.0.1", "C类"],
    ["223.1.1.1", "C类"],
    ["224.0.0.1", "D类"],
    ["239.255.255.255", "D类"],
    ["240.0.0.1", "E类"],
  ];
  for (const [address, kind] of ipCases) {
    addChoice(
      choices,
      "计算机网络",
      `按传统分类编址，IP地址 ${address} 属于`,
      kind,
      ["A类", "B类", "C类", "D类", "E类"].filter((item) => item !== kind).slice(0, 3),
    );
  }
  addBlank(blanks, "计算机网络", "用于本机环回测试的IPv4地址是____。", "127.0.0.1");
  addBlank(blanks, "计算机网络", "IPv4地址由____位二进制组成。", "32");
  addBlank(blanks, "计算机网络", "IPv6地址由____位二进制组成。", "128");
  addBlank(blanks, "计算机网络", "MAC地址通常由____位二进制组成。", "48");
  addBlank(blanks, "计算机网络", "C类IP地址的默认子网掩码是____。", "255.255.255.0");
  addBlank(blanks, "计算机网络", "B类IP地址的默认子网掩码是____。", "255.255.0.0");
  addBlank(blanks, "计算机网络", "A类IP地址的默认子网掩码是____。", "255.0.0.0");
  addBlank(blanks, "计算机网络", "子网掩码255.255.255.128的前缀长度是____。", "25");
  addBlank(blanks, "计算机网络", "前缀长度/26对应的子网掩码是____。", "255.255.255.192");
  addBlank(blanks, "计算机网络", "前缀长度/27对应的子网掩码是____。", "255.255.255.224");
  addBlank(blanks, "计算机网络", "前缀长度/28对应的子网掩码是____。", "255.255.255.240");
  addBlank(blanks, "计算机网络", "前缀长度/30对应的子网掩码是____。", "255.255.255.252");
  addBlank(blanks, "计算机网络", "IPv4中，/24网络在保留网络地址和广播地址后，可用主机数是____。", "254");
  addBlank(blanks, "计算机网络", "IPv4中，/30网络在保留网络地址和广播地址后，可用主机数是____。", "2");
  addBlank(blanks, "计算机网络", "私有A类网络10.0.0.0的默认前缀长度是____。", "8");
  addBlank(blanks, "计算机网络", "私有C类网络常见的前缀192.168.0.0/____。", "16");

  ports.forEach((item, index) => {
    const [port, service] = item;
    const serviceOptions = others(ports, index, 3, (entry) => entry[1]).map((entry) => entry[1]);
    addChoice(choices, "计算机网络", `TCP/IP中，端口 ${port} 的常见用途是`, service, serviceOptions);
  });
  for (const [port, service] of ports.slice(0, 12)) {
    addBlank(blanks, "计算机网络", `${service}的常见端口号是____。`, String(port));
  }

  const capacities = [
    [1, "KB", 1024, "字节"],
    [2, "KB", 2048, "字节"],
    [4, "KB", 4096, "字节"],
    [1, "MB", 1024, "KB"],
    [2, "MB", 2048, "KB"],
    [1, "GB", 1024, "MB"],
    [4, "GB", 4096, "MB"],
    [1, "TB", 1024, "GB"],
  ];
  for (const [amount, fromUnit, result, toUnit] of capacities) {
    addBlank(blanks, "数据单位", `按1024进位，${amount}${fromUnit}等于____${toUnit}。`, String(result));
    addChoice(
      choices,
      "数据单位",
      `按1024进位，${amount}${fromUnit}等于多少${toUnit}`,
      String(result),
      wrongNumbers(result, (value) => String(value)),
    );
  }
  addBlank(blanks, "数据单位", "一个字节等于____个比特。", "8");
  addBlank(blanks, "数据单位", "按字节编址时，16根地址线的寻址空间是____KB。", "64");
  addBlank(blanks, "数据单位", "按字节编址时，20根地址线的寻址空间是____MB。", "1");
  addBlank(blanks, "数据单位", "按字节编址时，32根地址线的寻址空间是____GB。", "4");
  addBlank(blanks, "数据单位", "十六进制地址范围2000H到3FFFH按字节编址，存储容量是____KB。", "8");
  addBlank(blanks, "数据单位", "十六进制地址范围0000H到FFFFH按字节编址，存储容量是____KB。", "64");
  addBlank(blanks, "数据单位", "十六进制地址范围0000H到7FFFH按字节编址，存储容量是____KB。", "32");

  for (const leaves of [2, 3, 4, 5, 6, 8, 10, 16]) {
    const leafCount = leaves + 1;
    addBlank(blanks, "数据结构", `任意二叉树中，若度为2的结点数为 ${leaves}，则叶子结点数是____。`, String(leafCount));
    addChoice(
      choices,
      "数据结构",
      `任意二叉树中，若度为2的结点数为 ${leaves}，则叶子结点数是`,
      String(leafCount),
      wrongNumbers(leafCount, (value) => String(value)),
    );
  }
  for (const depth of [1, 2, 3, 4, 5, 6]) {
    const total = 2 ** depth - 1;
    addBlank(blanks, "数据结构", `根结点深度记为1时，深度为 ${depth} 的满二叉树结点总数是____。`, String(total));
    addChoice(
      choices,
      "数据结构",
      `根结点深度记为1时，深度为 ${depth} 的满二叉树结点总数是`,
      String(total),
      wrongNumbers(total, (value) => String(value)),
    );
  }

  for (let number = 1; number <= 220; number += 1) {
    if (binaryNumbers.includes(number)) continue;
    const correct = number.toString(2);
    addChoice(
      choices,
      "数制与编码",
      `把十进制整数 ${number} 写成二进制，结果是`,
      correct,
      wrongNumbers(number, (value) => value.toString(2)),
    );
    addBlank(blanks, "数制与编码", `把十进制整数 ${number} 写成二进制，结果是____。`, correct);
  }

  return { choices, blanks };
}

function takeUnique(items, limit) {
  if (items.length < limit) throw new Error(`题目不足 ${limit}，实际 ${items.length}`);
  return items.slice(0, limit);
}

function buildBank() {
  const generated = buildGenerated();
  const choices = [];
  const blanks = [];
  for (const item of conceptChoices) addChoice(choices, item[0], item[1], item[2], item.slice(3));
  for (const item of conceptBlanks) addBlank(blanks, item[0], item[1], item[2]);
  const fillerChoice = (question) =>
    question.stem.startsWith("把十进制整数") ||
    question.stem.startsWith("2的") ||
    question.stem.includes("未压缩") ||
    question.stem.startsWith("按1024进位");
  const fillerBlank = (question) => question.stem.startsWith("把十进制整数");
  const selectedChoices = takeUnique(
    choices.concat(
      generated.choices.filter((question) => !fillerChoice(question)),
      generated.choices.filter(fillerChoice),
    ),
    500,
  );
  const selectedBlanks = takeUnique(
    blanks.concat(
      generated.blanks.filter((question) => !fillerBlank(question)),
      generated.blanks.filter(fillerBlank),
    ),
    500,
  );
  const topicOrder = [
    "计算机概述",
    "硬件系统",
    "数制与编码",
    "数据单位",
    "名词与缩写",
    "操作系统",
    "程序与软件",
    "数据结构",
    "计算机网络",
    "数据库",
    "信息安全",
    "多媒体",
  ];
  const topicRank = new Map(topicOrder.map((topic, index) => [topic, index]));
  return selectedChoices
    .concat(selectedBlanks)
    .sort((left, right) => {
      const topicDiff = (topicRank.get(left.topic) ?? 99) - (topicRank.get(right.topic) ?? 99);
      if (topicDiff !== 0) return topicDiff;
      if (left.type !== right.type) return left.type === "choice" ? -1 : 1;
      return 0;
    })
    .map((question, index) => ({ id: index + 1, ...question }));
}

function markdownQuestions(questions) {
  const lines = ["# 计算机基础知识题库", "", "共 1000 题，只包含单项选择题和填空题。答案见同目录《答案.md》。", ""];
  let lastTopic = "";
  let lastType = "";
  for (const question of questions) {
    if (question.topic !== lastTopic) {
      lines.push(`## ${question.topic}`, "");
      lastTopic = question.topic;
      lastType = "";
    }
    if (question.type !== lastType) {
      lines.push(question.type === "choice" ? "### 选择题" : "### 填空题", "");
      lastType = question.type;
    }
    lines.push(`${question.id}. ${question.stem}`);
    if (question.type === "choice") {
      question.options.forEach((option, index) => lines.push(`   ${"ABCD"[index]}. ${option}`));
    }
    lines.push("");
  }
  return lines.join("\n");
}

function markdownAnswers(questions) {
  const lines = ["# 计算机基础知识题库答案", "", "题号与《题目.md》一致。", ""];
  for (const question of questions) {
    const answer = question.type === "choice" ? question.answer : question.answer;
    lines.push(`${question.id}. ${answer}`);
  }
  lines.push("");
  return lines.join("\n");
}

function writeReadme(questions) {
  const counts = new Map();
  for (const question of questions) {
    const key = `${question.topic} ${question.type === "choice" ? "选择" : "填空"}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const rows = [...counts].map(([name, count]) => `| ${name} | ${count} |`).join("\n");
  const text = `# 使用说明

本目录有 1000 道计算机基础练习题，其中单项选择题 500 道、填空题 500 道。

当前环境无法访问外部网页，因此这些题目不是从某个网站复制的题库，而是按大学计算机基础和信息技术基础的常见范围原创编写。进制、编码、容量、地址空间、音频和图像大小等数值题由程序计算。

教学口径说明：

- 存储容量换算按 1 KB = 1024 B。
- 第一台通用电子数字计算机采用教材中常见的 ENIAC、1946 年说法。
- 汉字编码例题按 GB2312 的区位码、国标码和机内码关系计算。
- 填空题只给一个标准答案，意思相同的另一种写法可能未列入。

| 范围 | 题数 |
| --- | ---: |
${rows}

文件：

- \`题目.md\`：不含答案，适合自测。
- \`答案.md\`：按题号列出答案。
- \`questions.json\`：包含题型、范围、选项和答案。
`;
  fs.writeFileSync(path.join(root, "README.md"), text, "utf8");
}

const questions = buildBank();
const choiceCount = questions.filter((question) => question.type === "choice").length;
const blankCount = questions.filter((question) => question.type === "blank").length;
if (questions.length !== 1000 || choiceCount !== 500 || blankCount !== 500) {
  throw new Error(`题量不正确：总计${questions.length}，选择${choiceCount}，填空${blankCount}`);
}
fs.writeFileSync(path.join(root, "题目.md"), markdownQuestions(questions), "utf8");
fs.writeFileSync(path.join(root, "答案.md"), markdownAnswers(questions), "utf8");
fs.writeFileSync(
  path.join(root, "questions.json"),
  `${JSON.stringify({ title: "计算机基础知识题库", count: 1000, choiceCount, blankCount, questions }, null, 2)}\n`,
  "utf8",
);
writeReadme(questions);
console.log(`已生成 ${questions.length} 题`);
