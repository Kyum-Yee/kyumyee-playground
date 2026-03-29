const BASE = 'https://raw.githubusercontent.com/Kyum-Yee/expert-curriculum-library/main'

export interface Subject {
  slug: string
  category: '이과' | '문과'
  index: number
  title: string
  subtitle?: string
  stages: number
  dirName: string
}

function s(
  cat: '이과' | '문과',
  idx: number,
  title: string,
  dirName: string,
  subtitle?: string,
): Subject {
  return {
    slug: `${cat}-${String(idx).padStart(2, '0')}`,
    category: cat,
    index: idx,
    title,
    subtitle,
    stages: 5,
    dirName,
  }
}

export const SUBJECTS: Subject[] = [
  // 이과 25
  s('이과', 1,  '미적분학 및 해석학 기초',       '01-미적분학 및 해석학 기초 (Calculus & Foundations)',   'Calculus & Foundations'),
  s('이과', 2,  '선형대수학 및 텐서 해석',         '02-선형대수학 및 텐서 해석 (Linear Algebra & Tensors)',  'Linear Algebra & Tensors'),
  s('이과', 3,  '미분방정식 및 동역학 해석',       '03-미분방정식 및 동역학 해석 (Differential Equations)', 'Differential Equations'),
  s('이과', 4,  '확률',                            '04-확률 (Probability)',                                 'Probability'),
  s('이과', 5,  '이산수학 및 암호학 기초',         '05-이산수학 및 암호학 기초 (Discrete Math & Crypto)',   'Discrete Math & Crypto'),
  s('이과', 6,  '고전 및 라그랑주 역학',           '06-고전 및 라그랑주 역학 (Advanced Mechanics)',         'Advanced Mechanics'),
  s('이과', 7,  '전자기학 및 장론',               '07-전자기학 및 장론 (Electromagnetics)',                'Electromagnetics'),
  s('이과', 8,  '열 및 통계물리학',               '08-열 및 통계물리학 (Statistical Physics)',             'Statistical Physics'),
  s('이과', 9,  '양자역학 및 정보 이론',           '09-양자역학 및 정보 이론 (Quantum Info)',               'Quantum Info'),
  s('이과', 10, '물리화학 및 나노 소재학',         '10-물리화학 및 나노 소재학 (Chem-Physics)',             'Chem-Physics'),
  s('이과', 11, '유기화학 및 분자 합성학',         '11-유기화학 및 분자 합성학'),
  s('이과', 12, '일반생물학 및 세포 공학',         '12-일반생물학 및 세포 공학'),
  s('이과', 13, '의학생리학',                     '13-의학생리학 (Medical Physiology)',                    'Medical Physiology'),
  s('이과', 14, '분자생물학 및 유전공학',          '14-분자생물학 및 유전공학'),
  s('이과', 15, '인체 해부학 및 조직학',           '15-인체 해부학 및 조직학'),
  s('이과', 16, '생화학 및 약리 공학',             '16-생화학 및 약리 공학'),
  s('이과', 17, '뇌과학 및 인지 신경공학',         '17-뇌과학 및 인지 신경공학'),
  s('이과', 18, '알고리즘 및 고급 자료구조',       '18-알고리즘 및 고급 자료구조'),
  s('이과', 19, '운영체제 및 시스템 아키텍처',     '19-운영체제 및 시스템 아키텍처'),
  s('이과', 20, '네트워크 및 정보 보안',           '20-네트워크 및 정보 보안'),
  s('이과', 21, '인공지능 및 생성형 AI',           '21-인공지능 및 생성형 AI (AI & Generative AI)',         'AI & Generative AI'),
  s('이과', 22, '로봇공학 및 자동제어',            '22-로봇공학 및 자동제어 (Robotics)',                    'Robotics'),
  s('이과', 23, '반도체 및 집적회로 설계',         '23-반도체 및 집적회로 설계'),
  s('이과', 24, '유체 및 항공우주 추진공학',       '24-유체 및 항공우주 추진공학'),
  s('이과', 25, '지구과학 및 행성과학',            '25-지구과학 및 행성과학 (Earth & Planetary Science)',   'Earth & Planetary Science'),

  // 문과 42
  s('문과', 1,  '철학',             '01-철학'),
  s('문과', 2,  '역사학',           '02-역사학'),
  s('문과', 3,  '언어학',           '03-언어학'),
  s('문과', 4,  '문학',             '04-문학'),
  s('문과', 5,  '종교학',           '05-종교학'),
  s('문과', 6,  '심리학',           '06-심리학'),
  s('문과', 7,  '사회학',           '07-사회학'),
  s('문과', 8,  '인류학',           '08-인류학'),
  s('문과', 9,  '인문지리학',       '09-인문지리학'),
  s('문과', 10, '교육학',           '10-교육학'),
  s('문과', 11, '정치학',           '11-정치학'),
  s('문과', 12, '법학',             '12-법학'),
  s('문과', 13, '경제학',           '13-경제학'),
  s('문과', 14, '경영학',           '14-경영학'),
  s('문과', 15, '미디어학',         '15-미디어학'),
  s('문과', 16, '수사학',           '16-수사학'),
  s('문과', 17, '미술학',           '17-미술학'),
  s('문과', 18, '사진테크닉',       '18-사진테크닉'),
  s('문과', 19, '디자인학',         '19-디자인학'),
  s('문과', 20, '건축학',           '20-건축학'),
  s('문과', 21, '음악학',           '21-음악학'),
  s('문과', 22, '사운드테크닉',     '22-사운드테크닉'),
  s('문과', 23, '영화학',           '23-영화학'),
  s('문과', 24, '애니메이션테크닉', '24-애니메이션테크닉'),
  s('문과', 25, '공연학',           '25-공연학'),
  s('문과', 26, '체육학',           '26-체육학'),
  s('문과', 27, '도예테크닉',       '27-도예테크닉'),
  s('문과', 28, '섬유테크닉',       '28-섬유테크닉'),
  s('문과', 29, '공작테크닉',       '29-공작테크닉'),
  s('문과', 30, '소재테크닉',       '30-소재테크닉'),
  s('문과', 31, '조향학',           '31-조향학'),
  s('문과', 32, '요리테크닉',       '32-요리테크닉'),
  s('문과', 33, '음료테크닉',       '33-음료테크닉'),
  s('문과', 34, '생태학',           '34-생태학'),
  s('문과', 35, '가드닝테크닉',     '35-가드닝테크닉'),
  s('문과', 36, '문화학',           '36-문화학'),
  s('문과', 37, '에티켓테크닉',     '37-에티켓테크닉'),
  s('문과', 38, '무술테크닉',       '38-무술테크닉'),
  s('문과', 39, '전략학',           '39-전략학'),
  s('문과', 40, '생존테크닉',       '40-생존테크닉'),
  s('문과', 41, '조종테크닉',       '41-조종테크닉 (다크사이콜로지)',                                  '다크사이콜로지'),
  s('문과', 42, '매력테크닉',       '42-매력테크닉'),
]

export function getSubject(slug: string): Subject | undefined {
  return SUBJECTS.find(s => s.slug === slug)
}

export function getRawUrl(subject: Subject, stage: number): string {
  const cat = encodeURIComponent(subject.category)
  const dir = encodeURIComponent(subject.dirName)
  const stageStr = String(stage).padStart(2, '0')
  const file = encodeURIComponent(`${stageStr}-단계${stage}.md`)
  return `${BASE}/${cat}/${dir}/${file}`
}

export async function fetchStageMarkdown(
  subject: Subject,
  stage: number,
): Promise<string | null> {
  const url = getRawUrl(subject, stage)
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}
