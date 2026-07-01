import type { TarotArcana, TarotCard } from "../types";

interface CardMeaningSeed {
  name: string;
  uprightKeywords: string[];
  uprightReading: string;
  reversedKeywords: string[];
  reversedReading: string;
}

interface SuitSeed {
  arcana: TarotArcana;
  label: string;
  cards: CardMeaningSeed[];
}

const majorCards: CardMeaningSeed[] = [
  {
    name: "愚者",
    uprightKeywords: ["新旅程", "信任", "自由"],
    uprightReading: "正位的愚者代表未知旅程的开启。它提醒你保持开放、信任直觉，但也要带着基本的觉察进入新阶段。",
    reversedKeywords: ["鲁莽", "逃避", "准备不足"],
    reversedReading: "逆位的愚者提示冲动和缺乏计划。你可能急着跳入新局面，却没有确认风险、边界和真实动机。"
  },
  {
    name: "魔术师",
    uprightKeywords: ["显化", "资源", "主动创造"],
    uprightReading: "正位的魔术师象征意志、技巧与资源的整合。你具备推动事情成形的条件，关键是专注并开始行动。",
    reversedKeywords: ["操控", "分散", "能力未发挥"],
    reversedReading: "逆位的魔术师表示能量被误用或没有聚焦。它提醒你警惕话术、投机和自我怀疑，把能力重新落到实际行动上。"
  },
  {
    name: "女祭司",
    uprightKeywords: ["直觉", "潜意识", "静默智慧"],
    uprightReading: "正位的女祭司指向内在知识和隐藏信息。答案暂时不适合用蛮力追问，而要通过观察、等待和倾听直觉获得。",
    reversedKeywords: ["直觉受阻", "秘密暴露", "内在失联"],
    reversedReading: "逆位的女祭司提示你可能忽视了内心信号，或被过多噪音干扰。先减少外界输入，再判断真正的问题。"
  },
  {
    name: "皇后",
    uprightKeywords: ["滋养", "丰盛", "创造力"],
    uprightReading: "正位的皇后代表生长、照料与感官丰盛。关系、作品或计划需要被温柔维护，耐心投入会带来可见成果。",
    reversedKeywords: ["过度付出", "匮乏感", "创造停滞"],
    reversedReading: "逆位的皇后提示照顾失衡。你可能把精力过度给别人，或因为缺乏安全感而压抑自己的创造力。"
  },
  {
    name: "皇帝",
    uprightKeywords: ["秩序", "权威", "边界"],
    uprightReading: "正位的皇帝强调结构、责任和稳定治理。清晰规则会带来安全感，适合制定计划、建立边界和承担领导位置。",
    reversedKeywords: ["控制欲", "僵化", "权威失衡"],
    reversedReading: "逆位的皇帝提示控制过度或结构松散。你需要分辨真正的秩序和单纯的压迫，重新调整权责。"
  },
  {
    name: "教皇",
    uprightKeywords: ["传统", "学习", "精神指引"],
    uprightReading: "正位的教皇代表体系化学习、伦理和传承。适合向可靠导师、制度或成熟经验寻求指导。",
    reversedKeywords: ["教条", "叛逆", "价值冲突"],
    reversedReading: "逆位的教皇提示你正在质疑旧规则。不是所有传统都适合现在，但打破它之前要清楚自己的价值依据。"
  },
  {
    name: "恋人",
    uprightKeywords: ["选择", "关系", "价值一致"],
    uprightReading: "正位的恋人代表深层联结和价值选择。真正的决定不只是被吸引，而是看见自己愿意承诺什么。",
    reversedKeywords: ["失衡关系", "犹豫", "价值不一致"],
    reversedReading: "逆位的恋人提示关系或选择中存在分裂。你可能为了和谐压低真实需求，或迟迟不愿面对关键决定。"
  },
  {
    name: "战车",
    uprightKeywords: ["意志", "胜利", "方向控制"],
    uprightReading: "正位的战车象征目标明确后的推进力。把冲突的力量收束到同一方向，你就能穿过阻力。",
    reversedKeywords: ["失控", "方向混乱", "强行推进"],
    reversedReading: "逆位的战车提示意志和方向脱节。若只靠硬撑前进，反而容易消耗过度或偏离真正目标。"
  },
  {
    name: "力量",
    uprightKeywords: ["勇气", "温柔", "内在稳定"],
    uprightReading: "正位的力量不是压制，而是温柔地驯服本能。它代表耐心、韧性和以柔克刚的成熟力量。",
    reversedKeywords: ["自我怀疑", "情绪失控", "力量耗竭"],
    reversedReading: "逆位的力量提示内在信心不足，或把脆弱伪装成强硬。真正的恢复来自接纳，而不是继续硬扛。"
  },
  {
    name: "隐士",
    uprightKeywords: ["独处", "内省", "寻找真理"],
    uprightReading: "正位的隐士代表从外界退后，寻找更深的答案。适合沉淀、研究、复盘，而不是急于获得掌声。",
    reversedKeywords: ["孤立", "逃避", "过度封闭"],
    reversedReading: "逆位的隐士提示独处可能变成隔绝。你需要分辨自己是在听从内心，还是借沉默逃避连接。"
  },
  {
    name: "命运之轮",
    uprightKeywords: ["转机", "循环", "时机"],
    uprightReading: "正位的命运之轮表示局势正在转动。顺势而为、观察周期，会比固执掌控带来更好的机会。",
    reversedKeywords: ["阻滞", "重复模式", "抗拒变化"],
    reversedReading: "逆位的命运之轮提示你可能被旧循环困住。若一直重复同样选择，就很难迎来真正的转机。"
  },
  {
    name: "正义",
    uprightKeywords: ["公平", "因果", "清晰判断"],
    uprightReading: "正位的正义强调事实、责任和公平判断。现在需要诚实面对因果，用清楚标准做决定。",
    reversedKeywords: ["偏见", "逃避责任", "不公"],
    reversedReading: "逆位的正义提示判断失衡或信息不透明。不要急着定论，先确认事实是否完整、责任是否被回避。"
  },
  {
    name: "倒吊人",
    uprightKeywords: ["暂停", "换位", "臣服"],
    uprightReading: "正位的倒吊人代表主动暂停和视角转换。暂时无法推进并非失败，而是邀请你用新的角度理解局面。",
    reversedKeywords: ["拖延", "无效牺牲", "抗拒放手"],
    reversedReading: "逆位的倒吊人提示你可能陷入被动等待，或为了证明自己而做无意义牺牲。需要重新选择。"
  },
  {
    name: "死神",
    uprightKeywords: ["结束", "转化", "清理"],
    uprightReading: "正位的死神代表必要的结束和深层转化。旧结构若已完成使命，放手会为新生命腾出空间。",
    reversedKeywords: ["抗拒结束", "停滞", "旧事纠缠"],
    reversedReading: "逆位的死神提示你明知该结束却仍抓住不放。真正的痛苦来自抗拒变化，而非变化本身。"
  },
  {
    name: "节制",
    uprightKeywords: ["调和", "疗愈", "适度"],
    uprightReading: "正位的节制代表整合、平衡与渐进疗愈。它鼓励你用稳定节奏调和冲突，而不是追求极端答案。",
    reversedKeywords: ["失衡", "过度", "节奏混乱"],
    reversedReading: "逆位的节制提示生活或情绪比例失调。先恢复基本节奏，再谈更大的目标。"
  },
  {
    name: "恶魔",
    uprightKeywords: ["束缚", "欲望", "执念"],
    uprightReading: "正位的恶魔揭示依赖、恐惧和欲望的锁链。看清它并不是审判自己，而是重新拿回选择权。",
    reversedKeywords: ["松绑", "觉察成瘾", "挣脱控制"],
    reversedReading: "逆位的恶魔代表开始看见束缚并尝试脱离。过程可能反复，但觉察已经让你不再完全受控。"
  },
  {
    name: "高塔",
    uprightKeywords: ["崩塌", "真相", "突变"],
    uprightReading: "正位的高塔带来突然揭露和结构崩塌。它清除不真实的稳定，迫使你在真相上重建。",
    reversedKeywords: ["延迟崩塌", "害怕改变", "内在震动"],
    reversedReading: "逆位的高塔提示危机正在内部累积。越是回避必要改变，最终冲击越难温和发生。"
  },
  {
    name: "星星",
    uprightKeywords: ["希望", "疗愈", "信任未来"],
    uprightReading: "正位的星星代表创伤后的平静修复。它给予希望、灵感和重新相信未来的能力。",
    reversedKeywords: ["失望", "信念低落", "疗愈受阻"],
    reversedReading: "逆位的星星提示你可能暂时看不见希望。不要强迫乐观，先从很小的恢复动作开始。"
  },
  {
    name: "月亮",
    uprightKeywords: ["迷雾", "梦境", "潜意识"],
    uprightReading: "正位的月亮代表不确定、投射和潜意识波动。此时信息未明，适合观察感受，不适合仓促定论。",
    reversedKeywords: ["真相浮现", "恐惧减弱", "混乱退去"],
    reversedReading: "逆位的月亮表示迷雾正在散开。你开始分辨直觉和恐惧，也更接近事实。"
  },
  {
    name: "太阳",
    uprightKeywords: ["明朗", "喜悦", "生命力"],
    uprightReading: "正位的太阳象征清晰、成功和坦率表达。事情会变得更透明，真实的自我也更容易被看见。",
    reversedKeywords: ["延迟喜悦", "自信不足", "过度乐观"],
    reversedReading: "逆位的太阳提示光仍在，但被阴影遮住。你需要调整期待，不要让短暂挫折否定整体方向。"
  },
  {
    name: "审判",
    uprightKeywords: ["觉醒", "召唤", "重生"],
    uprightReading: "正位的审判代表回应内在召唤和阶段性觉醒。过去经验正在被整合，你需要做出更成熟的选择。",
    reversedKeywords: ["自我批判", "拒绝召唤", "旧账未清"],
    reversedReading: "逆位的审判提示你可能被羞愧或迟疑困住。与其反复审判自己，不如承担修正行动。"
  },
  {
    name: "世界",
    uprightKeywords: ["完成", "整合", "圆满"],
    uprightReading: "正位的世界代表一个周期的成熟完成。你已整合经验，可以进入更广阔的阶段。",
    reversedKeywords: ["未完成", "收尾困难", "整合不足"],
    reversedReading: "逆位的世界提示某个环节尚未闭合。先完成收尾、确认经验，再开启下一轮旅程。"
  }
];

const suits: SuitSeed[] = [
  {
    arcana: "wands",
    label: "权杖",
    cards: [
      { name: "一", uprightKeywords: ["灵感", "启动", "创造冲动"], uprightReading: "权杖一正位代表新的热情、事业火花和行动种子。适合抓住灵感，迅速让计划进入现实。", reversedKeywords: ["延迟", "热情不足", "方向不明"], reversedReading: "权杖一逆位提示灵感被阻塞，或启动太快但目标不清。先明确你真正想点燃什么。" },
      { name: "二", uprightKeywords: ["规划", "远景", "选择道路"], uprightReading: "权杖二正位代表站在现有基础上眺望更大世界。你需要制定路线，而不是只停留在想象。", reversedKeywords: ["保守", "计划不足", "害怕扩张"], reversedReading: "权杖二逆位提示视野被安全感限制。可能不是没有机会，而是你还没准备好承担扩张带来的责任。" },
      { name: "三", uprightKeywords: ["扩展", "等待成果", "合作"], uprightReading: "权杖三正位象征计划已发出，正在等待回音。远方机会、合作和成长空间开始显现。", reversedKeywords: ["延误", "视野受限", "合作不顺"], reversedReading: "权杖三逆位提示计划推进受阻，可能因沟通不足或期待过窄。需要重新评估外部条件。" },
      { name: "四", uprightKeywords: ["庆祝", "安定", "归属"], uprightReading: "权杖四正位代表阶段性稳定、庆祝和共同归属。适合确认成果，建立更安心的基础。", reversedKeywords: ["不稳定", "家庭摩擦", "庆祝延后"], reversedReading: "权杖四逆位提示表面的和谐下仍有不稳。你需要处理基础关系，而不是只维持热闹气氛。" },
      { name: "五", uprightKeywords: ["竞争", "冲突", "磨合"], uprightReading: "权杖五正位代表意见交锋和能量碰撞。冲突未必是坏事，它能暴露真正需要协调的地方。", reversedKeywords: ["内耗", "逃避冲突", "恶性竞争"], reversedReading: "权杖五逆位提示冲突可能变成消耗，或你过度回避必要表达。需要把竞争转回建设性讨论。" },
      { name: "六", uprightKeywords: ["胜利", "认可", "公开成果"], uprightReading: "权杖六正位象征努力被看见，适合公开展示成果。它也提醒你带着责任接受掌声。", reversedKeywords: ["虚荣", "认可不足", "胜利不稳"], reversedReading: "权杖六逆位提示你可能过度依赖外界评价，或成果尚未真正站稳。先确认实力，而不是只追求掌声。" },
      { name: "七", uprightKeywords: ["防守", "坚持", "立场"], uprightReading: "权杖七正位代表守住位置和立场。面对质疑时，清楚知道自己为何坚持很重要。", reversedKeywords: ["疲惫", "退让", "防御过度"], reversedReading: "权杖七逆位提示你可能已经防守过久。判断哪些战役值得继续，哪些只是消耗自尊。" },
      { name: "八", uprightKeywords: ["加速", "消息", "快速推进"], uprightReading: "权杖八正位代表进展加快、消息到来和阻碍减少。适合迅速回应机会。", reversedKeywords: ["延迟", "混乱", "急躁"], reversedReading: "权杖八逆位提示节奏失控或消息延误。越急越容易出错，先整理优先级。" },
      { name: "九", uprightKeywords: ["韧性", "警觉", "最后防线"], uprightReading: "权杖九正位代表经历挑战后的坚持。你已经很接近完成，但需要保护能量和边界。", reversedKeywords: ["耗竭", "过度防备", "旧伤触发"], reversedReading: "权杖九逆位提示疲惫和戒备正在影响判断。不是所有新状况都是旧伤重演。" },
      { name: "十", uprightKeywords: ["重担", "责任", "压力"], uprightReading: "权杖十正位代表承担过多责任。目标虽然重要，但需要分配负担，否则热情会被压垮。", reversedKeywords: ["卸责", "释放负担", "不堪重负"], reversedReading: "权杖十逆位提示你需要放下不属于自己的责任，也可能表示终于开始减负。" },
      { name: "侍从", uprightKeywords: ["探索", "热情消息", "新点子"], uprightReading: "权杖侍从正位代表好奇、创意消息和尝试精神。适合探索新方向，不必一开始就完美。", reversedKeywords: ["三分钟热度", "不成熟", "消息延迟"], reversedReading: "权杖侍从逆位提示热情易散，计划缺乏落地。把想法缩小成可执行的第一步。" },
      { name: "骑士", uprightKeywords: ["冒险", "冲劲", "迅速行动"], uprightReading: "权杖骑士正位代表强烈行动力和冒险精神。适合突破停滞，但要留意节奏和承诺。", reversedKeywords: ["鲁莽", "暴躁", "半途而废"], reversedReading: "权杖骑士逆位提示冲动、急躁或方向反复。先稳住火力，再决定是否出发。" },
      { name: "王后", uprightKeywords: ["自信", "魅力", "创造热情"], uprightReading: "权杖王后正位代表自信、感染力和生命热度。她鼓励你大胆表达，同时照亮他人。", reversedKeywords: ["嫉妒", "自我怀疑", "控制欲"], reversedReading: "权杖王后逆位提示热情被不安扭曲。你需要确认自身价值，而不是通过比较证明自己。" },
      { name: "国王", uprightKeywords: ["远见", "领导", "成熟行动"], uprightReading: "权杖国王正位代表有远见的领导力。它鼓励你以成熟策略带领行动，而不是只凭冲劲。", reversedKeywords: ["专断", "急功近利", "滥用权威"], reversedReading: "权杖国王逆位提示领导能量失衡。若只追求控制和结果，团队热情会被消耗。" }
    ]
  },
  {
    arcana: "cups",
    label: "圣杯",
    cards: [
      { name: "一", uprightKeywords: ["爱", "情感开启", "疗愈"], uprightReading: "圣杯一正位代表情感流动、爱意和内心疗愈的开始。适合敞开心，接纳新的关系或创作灵感。", reversedKeywords: ["情感压抑", "空虚", "自爱不足"], reversedReading: "圣杯一逆位提示情感被堵住，或你把爱给出去却没有滋养自己。先回到自我照料。" },
      { name: "二", uprightKeywords: ["互相吸引", "和解", "伙伴关系"], uprightReading: "圣杯二正位象征平等互惠的连接。它常指亲密关系、合作默契或真诚和解。", reversedKeywords: ["失衡", "误解", "关系裂缝"], reversedReading: "圣杯二逆位提示关系中的给予和接收不对等。需要诚实沟通，而不是维持表面亲近。" },
      { name: "三", uprightKeywords: ["友谊", "庆祝", "支持网络"], uprightReading: "圣杯三正位代表友情、社群支持和共同庆祝。你不必独自消化所有情绪。", reversedKeywords: ["小圈子", "过度社交", "情感混乱"], reversedReading: "圣杯三逆位提示社交可能带来消耗、八卦或界限混乱。选择真正滋养你的圈子。" },
      { name: "四", uprightKeywords: ["冷淡", "沉思", "重新评估"], uprightReading: "圣杯四正位代表情感倦怠和对现有机会缺乏回应。你需要分辨是无聊，还是内心真正需要更新。", reversedKeywords: ["重新开放", "错过机会", "情绪复苏"], reversedReading: "圣杯四逆位提示你开始从封闭中醒来。新的情感机会出现，但需要主动抬头看见。" },
      { name: "五", uprightKeywords: ["失落", "遗憾", "哀悼"], uprightReading: "圣杯五正位代表对失去的哀伤。它允许你承认遗憾，但也提醒仍有未被看见的支持存在。", reversedKeywords: ["释怀", "自责减少", "向前看"], reversedReading: "圣杯五逆位表示悲伤正在松动。你可以带着经验向前，而不是继续困在自责里。" },
      { name: "六", uprightKeywords: ["回忆", "纯真", "旧缘"], uprightReading: "圣杯六正位代表怀旧、童年记忆和温柔馈赠。过去的善意可能成为现在的疗愈资源。", reversedKeywords: ["困在过去", "理想化旧事", "成长停滞"], reversedReading: "圣杯六逆位提示你可能过度美化过去。怀念可以温柔，但不能代替当下的成长。" },
      { name: "七", uprightKeywords: ["幻想", "选择过多", "诱惑"], uprightReading: "圣杯七正位代表想象力和多重选择。它提醒你从美丽幻象中挑出真正可实现的愿望。", reversedKeywords: ["清醒", "选择落地", "幻想破灭"], reversedReading: "圣杯七逆位提示迷雾开始散去。你需要减少选项，把注意力交给最真实的一项。" },
      { name: "八", uprightKeywords: ["离开", "寻找意义", "情感断舍离"], uprightReading: "圣杯八正位代表离开不再滋养你的情境。外表未必糟糕，但内心已经渴望更深意义。", reversedKeywords: ["不舍", "逃避离开", "回头"], reversedReading: "圣杯八逆位提示你在离开与留下之间摇摆。先确认你害怕失去什么，再做决定。" },
      { name: "九", uprightKeywords: ["满足", "愿望实现", "情感富足"], uprightReading: "圣杯九正位代表情感满足和愿望达成。它鼓励你享受成果，同时保持感恩。", reversedKeywords: ["表面满足", "贪心", "空虚"], reversedReading: "圣杯九逆位提示外在满足未必填补内心空洞。需要问自己真正渴望的是什么。" },
      { name: "十", uprightKeywords: ["幸福家庭", "情感圆满", "归属"], uprightReading: "圣杯十正位代表关系中的和谐、家庭感和共享幸福。它强调长期情感安全。", reversedKeywords: ["家庭失和", "理想破裂", "情感落差"], reversedReading: "圣杯十逆位提示理想中的幸福与现实有差距。需要修复关系，而不是只维持画面。" },
      { name: "侍从", uprightKeywords: ["情感消息", "敏感", "创意萌芽"], uprightReading: "圣杯侍从正位代表温柔讯息、直觉创意和情感开放。适合表达善意或接触艺术灵感。", reversedKeywords: ["情绪幼稚", "敏感过度", "消息不实"], reversedReading: "圣杯侍从逆位提示情绪表达不成熟，或过度沉溺幻想。先确认感受，再决定回应。" },
      { name: "骑士", uprightKeywords: ["浪漫", "邀请", "理想追求"], uprightReading: "圣杯骑士正位代表浪漫邀请、情感表达和追随理想。它温柔但需要真实行动支撑。", reversedKeywords: ["情绪操控", "逃避现实", "空泛承诺"], reversedReading: "圣杯骑士逆位提示浪漫可能流于表演。注意甜言蜜语背后是否有稳定承诺。" },
      { name: "王后", uprightKeywords: ["共情", "直觉照料", "情感成熟"], uprightReading: "圣杯王后正位代表深度共情、疗愈能力和温柔直觉。她提醒你信任感受，但不失边界。", reversedKeywords: ["情绪淹没", "依附", "界限模糊"], reversedReading: "圣杯王后逆位提示你可能吸收了太多他人情绪。照顾别人之前，先保护自己的容器。" },
      { name: "国王", uprightKeywords: ["情绪稳定", "慈悲", "成熟支持"], uprightReading: "圣杯国王正位代表稳定的情感智慧。即使内心有波浪，也能以成熟和慈悲回应。", reversedKeywords: ["情绪压抑", "冷处理", "操控"], reversedReading: "圣杯国王逆位提示情绪被压住或被策略化使用。真正成熟不是没有情绪，而是诚实处理情绪。" }
    ]
  },
  {
    arcana: "swords",
    label: "宝剑",
    cards: [
      { name: "一", uprightKeywords: ["真相", "清晰", "新想法"], uprightReading: "宝剑一正位代表清晰认知、真相揭示和理性突破。适合做决定、说实话、切开混乱。", reversedKeywords: ["混乱", "误判", "言语伤害"], reversedReading: "宝剑一逆位提示思路不清或表达过锋利。先核对事实，避免把判断当成真相。" },
      { name: "二", uprightKeywords: ["僵持", "回避", "艰难选择"], uprightReading: "宝剑二正位代表理性僵局和暂时封闭。你可能知道要选择，却还不愿看见完整事实。", reversedKeywords: ["信息过载", "迟疑解除", "被迫面对"], reversedReading: "宝剑二逆位提示回避已难继续。信息虽然不完美，但你需要开始面对决定。" },
      { name: "三", uprightKeywords: ["心痛", "真相刺痛", "分离"], uprightReading: "宝剑三正位代表伤心、分离或痛苦真相。它不是惩罚，而是让被压抑的问题浮出水面。", reversedKeywords: ["疗愈", "释放痛苦", "旧伤复原"], reversedReading: "宝剑三逆位表示痛苦开始被处理。允许自己悲伤，也允许伤口慢慢闭合。" },
      { name: "四", uprightKeywords: ["休息", "恢复", "暂停思考"], uprightReading: "宝剑四正位代表休养、静心和暂时撤退。过度思考无法解决一切，恢复本身就是策略。", reversedKeywords: ["倦怠", "无法休息", "重新行动"], reversedReading: "宝剑四逆位提示你可能休息不足，或已经到了重新行动的时候。听身体比硬撑更重要。" },
      { name: "五", uprightKeywords: ["争斗", "胜之不武", "冲突代价"], uprightReading: "宝剑五正位代表争执、输赢执念和关系损耗。即使赢了，也要看代价是否值得。", reversedKeywords: ["停战", "修复", "放下争胜"], reversedReading: "宝剑五逆位提示冲突有机会收尾。放弃证明自己，可能比继续争胜更有力量。" },
      { name: "六", uprightKeywords: ["过渡", "离开混乱", "疗愈旅程"], uprightReading: "宝剑六正位代表从困难中迁移到更平静的状态。过程未必轻松，但方向正在改善。", reversedKeywords: ["难以前进", "旧问题拖延", "抗拒过渡"], reversedReading: "宝剑六逆位提示你可能带着旧模式原地打转。真正离开需要心理上也愿意移动。" },
      { name: "七", uprightKeywords: ["策略", "隐瞒", "独自行动"], uprightReading: "宝剑七正位代表策略、保密或绕路达成目标。它提醒你审视手段是否符合长期利益。", reversedKeywords: ["坦白", "骗局揭露", "自欺停止"], reversedReading: "宝剑七逆位提示隐藏之事浮现，或你开始不再欺骗自己。诚实会带来修正机会。" },
      { name: "八", uprightKeywords: ["限制", "困局", "自我束缚"], uprightReading: "宝剑八正位代表感觉被困，但限制中有一部分来自信念。先看见可行动的小空间。", reversedKeywords: ["解放", "看见出口", "摆脱受害感"], reversedReading: "宝剑八逆位表示束缚正在松开。你开始发现自己并非完全无能为力。" },
      { name: "九", uprightKeywords: ["焦虑", "失眠", "心理压力"], uprightReading: "宝剑九正位代表焦虑、内疚和反复担忧。它提醒你区分真实问题和头脑制造的灾难剧本。", reversedKeywords: ["求助", "压力释放", "走出阴影"], reversedReading: "宝剑九逆位提示痛苦可以被说出来。寻求支持会比独自承受更快恢复。" },
      { name: "十", uprightKeywords: ["终结", "崩溃", "低谷"], uprightReading: "宝剑十正位代表痛苦周期的结束。虽然局面看似彻底，但最坏的阶段已经接近尾声。", reversedKeywords: ["复原", "拒绝结束", "余痛未消"], reversedReading: "宝剑十逆位表示从低谷恢复，或仍不愿承认结束。不要把余痛误认为必须回头。" },
      { name: "侍从", uprightKeywords: ["观察", "消息", "求知"], uprightReading: "宝剑侍从正位代表敏锐观察、学习和信息收集。适合提问、研究和保持警觉。", reversedKeywords: ["流言", "仓促判断", "防备过度"], reversedReading: "宝剑侍从逆位提示信息可能不完整，或你过度警觉。先查证，再表达。" },
      { name: "骑士", uprightKeywords: ["果断", "快速沟通", "冲锋"], uprightReading: "宝剑骑士正位代表快速行动和直接表达。它适合突破拖延，但需要避免忽略他人感受。", reversedKeywords: ["冲动", "攻击性", "欠缺策略"], reversedReading: "宝剑骑士逆位提示言行过快、过硬。真相需要被说出，但方式也会决定结果。" },
      { name: "王后", uprightKeywords: ["洞察", "独立", "清晰边界"], uprightReading: "宝剑王后正位代表理性洞察和成熟边界。她鼓励诚实表达，同时保留尊严和清醒。", reversedKeywords: ["刻薄", "冷漠", "创伤防御"], reversedReading: "宝剑王后逆位提示防御可能变成锋利。你可以保护自己，但不必把所有靠近都视为威胁。" },
      { name: "国王", uprightKeywords: ["判断", "权威思维", "公正决策"], uprightReading: "宝剑国王正位代表清晰判断、专业权威和理性治理。适合制定规则、做严肃决定。", reversedKeywords: ["冷酷", "滥用理性", "专断"], reversedReading: "宝剑国王逆位提示理性可能被用来压制情感或操控局面。权威必须接受事实和伦理的检验。" }
    ]
  },
  {
    arcana: "pentacles",
    label: "星币",
    cards: [
      { name: "一", uprightKeywords: ["机会", "资源", "现实种子"], uprightReading: "星币一正位代表现实层面的新机会，如金钱、工作、健康或长期计划的种子。适合务实开始。", reversedKeywords: ["错失机会", "资源不足", "不稳定开端"], reversedReading: "星币一逆位提示机会可能被低估或基础不足。先确认资源、时间和承诺是否到位。" },
      { name: "二", uprightKeywords: ["平衡", "调度", "多任务"], uprightReading: "星币二正位代表在多项责任间保持弹性。你需要灵活安排，而不是追求一次性完美稳定。", reversedKeywords: ["失衡", "财务压力", "顾此失彼"], reversedReading: "星币二逆位提示资源调度已经吃紧。减少变量，比继续硬撑更现实。" },
      { name: "三", uprightKeywords: ["合作", "技能", "专业建设"], uprightReading: "星币三正位代表团队协作、技能打磨和专业认可。好成果来自清晰分工和持续练习。", reversedKeywords: ["合作不良", "粗糙", "不被认可"], reversedReading: "星币三逆位提示协作或质量出现问题。需要重新对齐标准，而不是各做各的。" },
      { name: "四", uprightKeywords: ["保守", "掌控资源", "安全感"], uprightReading: "星币四正位代表守住资源和建立安全感。适度保留有益，但过度抓紧会让流动停止。", reversedKeywords: ["松手", "吝啬", "失去控制"], reversedReading: "星币四逆位提示你可能过度害怕失去，或被迫重新分配资源。安全感需要更新来源。" },
      { name: "五", uprightKeywords: ["匮乏", "孤立", "现实困难"], uprightReading: "星币五正位代表经济、身体或归属感上的困难。它提醒你寻求支持，不要在困境中自我隔离。", reversedKeywords: ["援助出现", "走出贫乏", "恢复希望"], reversedReading: "星币五逆位表示资源正在回流，或你终于愿意接受帮助。复原从连接开始。" },
      { name: "六", uprightKeywords: ["给予", "互惠", "资源分配"], uprightReading: "星币六正位代表慷慨、援助和公平分配。它提醒你看清给予和接受之间的权力关系。", reversedKeywords: ["不平等", "债务", "施舍控制"], reversedReading: "星币六逆位提示资源关系可能失衡。帮助若带着控制，就不是真正的互惠。" },
      { name: "七", uprightKeywords: ["评估", "等待收成", "长期投入"], uprightReading: "星币七正位代表对长期努力进行评估。成果需要时间，但也要检查投入是否仍值得。", reversedKeywords: ["急躁", "回报不足", "方向需调整"], reversedReading: "星币七逆位提示等待让你疲惫，或投入产出不匹配。需要调整策略，而不是盲目继续。" },
      { name: "八", uprightKeywords: ["练习", "工艺", "专注"], uprightReading: "星币八正位代表持续练习、专业技能和踏实积累。重复不是乏味，而是通往精进的路径。", reversedKeywords: ["敷衍", "完美主义", "技能停滞"], reversedReading: "星币八逆位提示工作质量或学习节奏失衡。要么太随便，要么被完美主义拖住。" },
      { name: "九", uprightKeywords: ["独立", "丰盛", "自我价值"], uprightReading: "星币九正位代表独立成果、物质舒适和自我肯定。你有资格享受自己建立的稳定。", reversedKeywords: ["依赖", "表面富足", "价值感不足"], reversedReading: "星币九逆位提示外在条件不等于内在价值。你可能需要重建独立感和真实安全感。" },
      { name: "十", uprightKeywords: ["传承", "长期稳定", "家族资源"], uprightReading: "星币十正位代表长期积累、家族或组织资源、稳定传承。它关注可持续的现实结构。", reversedKeywords: ["家族压力", "资源分裂", "短视"], reversedReading: "星币十逆位提示传统资源中有压力或裂缝。要分辨传承和束缚，重新定义稳定。" },
      { name: "侍从", uprightKeywords: ["学习", "务实计划", "新机会"], uprightReading: "星币侍从正位代表认真学习、实际计划和可落地的新机会。适合从基础开始慢慢建立。", reversedKeywords: ["懒散", "计划空泛", "不切实际"], reversedReading: "星币侍从逆位提示想法缺少执行，或学习态度不稳定。把目标拆小，先完成一件具体事。" },
      { name: "骑士", uprightKeywords: ["勤勉", "可靠", "稳定推进"], uprightReading: "星币骑士正位代表耐心、责任和稳定执行。速度不快，但每一步都能积累可靠结果。", reversedKeywords: ["停滞", "固执", "乏味重复"], reversedReading: "星币骑士逆位提示稳定变成僵化。需要检查流程是否仍有效，而不是只因习惯继续。" },
      { name: "王后", uprightKeywords: ["滋养现实", "富足", "照料身体"], uprightReading: "星币王后正位代表现实照料、身体感和丰盛管理。她鼓励你把爱落实到生活品质中。", reversedKeywords: ["过度操劳", "忽视身体", "物质焦虑"], reversedReading: "星币王后逆位提示你可能照顾太多却忽略自己。身体和资源都需要被温柔管理。" },
      { name: "国王", uprightKeywords: ["财富管理", "稳定权威", "成熟资源"], uprightReading: "星币国王正位代表成熟的资源掌控、商业判断和长期稳定。它鼓励务实建设，而非短期投机。", reversedKeywords: ["贪婪", "保守僵化", "资源控制"], reversedReading: "星币国王逆位提示资源权力可能失衡。若只追求占有，稳定会变成沉重的控制。" }
    ]
  }
];

function createCard(id: string, arcana: TarotArcana, name: string, seed: CardMeaningSeed): TarotCard {
  return {
    id,
    arcana,
    name,
    keywords: seed.uprightKeywords,
    reading: seed.uprightReading,
    upright: {
      keywords: seed.uprightKeywords,
      reading: seed.uprightReading
    },
    reversed: {
      keywords: seed.reversedKeywords,
      reading: seed.reversedReading
    }
  };
}

const minorCards = suits.flatMap((suit) =>
  suit.cards.map((card, index) => createCard(`${suit.arcana}-${index}`, suit.arcana, `${suit.label}${card.name}`, card))
);

export const TAROT_DECK: TarotCard[] = [
  ...majorCards.map((card, index) => createCard(`major-${index}`, "major", card.name, card)),
  ...minorCards
];
