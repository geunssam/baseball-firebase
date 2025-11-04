import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import {
  CONDITION_TYPES,
  CONDITION_LABELS,
  CONDITION_DESCRIPTIONS,
  CONDITION_INPUT_CONFIG,
  validateConditionData,
  getDefaultConditionData
} from '../constants/badgeConditions';

const FREQUENT_EMOJIS = [
  '⚾', '🏆', '🎯', '💪', '🌟', '🔥', '⚡', '🎉',
  '👍', '🏅', '💯', '🎊', '🌈', '✨', '🎁', '🏃'
];

const EMOJI_CATEGORIES = {
  '스포츠 & 게임': [
    '⚾', '🏀', '🏈', '⚽', '🎾', '🏐', '🏓', '🏸',
    '🥊', '🥋', '⛳', '🏹', '🎣', '🥅', '🥏', '🪁',
    '🛹', '🛼', '🏏', '🏑', '🏒', '🥍', '🪃', '🏹'
  ],
  '감정 & 표정': [
    '😊', '🎉', '💪', '👍', '🙌', '👏', '🤗', '😎',
    '🤩', '🥳', '😇', '🌟', '✨', '💫', '⭐', '🌠',
    '🔥', '⚡', '💥', '💢', '💯', '💝', '💖', '💗'
  ],
  '하트 & 사랑': [
    '❤️', '💙', '💚', '💛', '🧡', '💜', '🤎', '🖤',
    '🤍', '💖', '💗', '💓', '💞', '💕', '💟', '❣️',
    '💔', '❤️‍🔥', '❤️‍🩹', '💘', '💝', '💌', '💋', '💑'
  ],
  '음식 & 간식': [
    '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚',
    '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯',
    '🥖', '🧀', '🥗', '🥙', '🌮', '🌯', '🫔', '🥪'
  ],
  '동물': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉'
  ],
  '자연 & 날씨': [
    '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
    '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️',
    '🌫️', '🌈', '☔', '⚡', '⭐', '🌟', '✨', '💫'
  ],
  '교통 & 이동': [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
    '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵',
    '🚲', '🛴', '🛹', '🚁', '✈️', '🛫', '🛬', '🚀'
  ],
  '도구 & 물건': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
    '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿'
  ],
  '학용품 & 책': [
    '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔',
    '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖',
    '✏️', '✒️', '🖊️', '🖋️', '🖍️', '📝', '💼', '📁'
  ],
  '음악 & 예술': [
    '🎵', '🎶', '🎼', '🎹', '🎸', '🎺', '🎷', '🎻',
    '🥁', '🎤', '🎧', '🎬', '🎭', '🎨', '🖌️', '🖍️',
    '🎪', '🎨', '🎰', '🎲', '🎯', '🎳', '🎮', '🕹️'
  ],
  '보석 & 장식': [
    '💎', '💍', '💄', '👑', '👒', '🎩', '🎓', '⛑️',
    '📿', '💄', '👓', '🕶️', '🥽', '🥼', '🦺', '👔',
    '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘'
  ],
  '시간 & 날짜': [
    '⏰', '⏱️', '⏲️', '⏳', '⌛', '🕐', '🕑', '🕒',
    '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚',
    '🕛', '📅', '📆', '🗓️', '📇', '🗂️', '🗃️', '🗄️'
  ]
};

const TIER_OPTIONS = [
  { value: 1, label: '입문', color: 'bg-gray-100' },
  { value: 2, label: '숙련', color: 'bg-blue-100' },
  { value: 3, label: '마스터', color: 'bg-purple-100' },
  { value: 4, label: '레전드', color: 'bg-yellow-100' },
  { value: 5, label: '특별', color: 'bg-red-100' }
];

export default function BadgeCreator({
  onSave,
  onCancel,
  initialBadge = null,
  standalone = true
}) {
  const [icon, setIcon] = useState(initialBadge?.icon || '⚾');
  const [name, setName] = useState(initialBadge?.name || '');
  const [description, setDescription] = useState(initialBadge?.description || '');
  const [tier, setTier] = useState(initialBadge?.tier || 1);
  const [selectedCategory, setSelectedCategory] = useState('스포츠 & 게임');
  const [conditionType, setConditionType] = useState(initialBadge?.conditionType || CONDITION_TYPES.MANUAL);
  const [conditionData, setConditionData] = useState(initialBadge?.conditionData || null);

  // 조건 타입 변경 시 기본 데이터 설정
  useEffect(() => {
    if (conditionType === CONDITION_TYPES.MANUAL) {
      setConditionData(null);
    } else {
      const defaultData = getDefaultConditionData(conditionType);
      setConditionData(defaultData);
    }
  }, [conditionType]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('배지 이름을 입력하세요.');
      return;
    }

    // 조건 데이터 검증
    if (conditionType !== CONDITION_TYPES.MANUAL) {
      const validation = validateConditionData(conditionType, conditionData || {});
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

    const badge = {
      id: initialBadge?.id || `custom-${Date.now()}`,
      icon,
      name: name.trim(),
      description: description.trim(),
      tier,
      badgeType: initialBadge?.badgeType || 'custom',
      conditionType: conditionType,
      conditionData: conditionType === CONDITION_TYPES.MANUAL ? null : conditionData,
      isCustom: initialBadge?.isCustom ?? true,
      createdAt: initialBadge?.createdAt || new Date().toISOString()
    };

    onSave(badge);
  };

  return (
    <div className="space-y-6">
      {/* 이모지 선택 */}
      <div>
        <Label>이모지 선택</Label>
        <div className="flex gap-2 mb-4">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="이모지 입력"
            maxLength={2}
            className="w-24 text-2xl text-center"
          />
          <div className="text-sm text-muted-foreground flex items-center">
            직접 입력하거나 아래에서 선택
          </div>
        </div>

        {/* 자주 사용 */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">자주 사용:</p>
          <div className="grid grid-cols-8 gap-2">
            {FREQUENT_EMOJIS.map((emoji, idx) => (
              <button
                key={`freq-${idx}`}
                onClick={() => setIcon(emoji)}
                className={`text-3xl p-2 rounded hover:bg-accent transition-colors ${
                  icon === emoji ? 'ring-2 ring-primary bg-accent' : ''
                }`}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리별 */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">카테고리별:</p>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded bg-gray-50">
            {EMOJI_CATEGORIES[selectedCategory].map((emoji, idx) => (
              <button
                key={`cat-${idx}`}
                onClick={() => setIcon(emoji)}
                className={`text-3xl p-2 rounded hover:bg-accent transition-colors ${
                  icon === emoji ? 'ring-2 ring-primary bg-accent' : ''
                }`}
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 배지 정보 */}
      <div>
        <Label htmlFor="badge-name">배지 이름</Label>
        <Input
          id="badge-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 팀워크의 달인"
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {name.length}/20자
        </p>
      </div>

      <div>
        <Label>배지 등급</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {TIER_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setTier(option.value)}
              className={`p-3 rounded-lg font-semibold transition-all ${option.color} ${
                tier === option.value ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
              }`}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="badge-desc">배지 설명</Label>
        <Textarea
          id="badge-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 팀원들과 협력을 잘했어요"
          maxLength={100}
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {description.length}/100자
        </p>
      </div>

      {/* 자동 수여 조건 설정 */}
      <div>
        <Label htmlFor="condition-type">자동 수여 조건</Label>
        <select
          id="condition-type"
          value={conditionType}
          onChange={(e) => setConditionType(e.target.value)}
          className="w-full p-2 border rounded mt-1"
        >
          {Object.entries(CONDITION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {CONDITION_DESCRIPTIONS[conditionType]}
        </p>

        {/* 조건 값 입력 필드 */}
        {conditionType !== CONDITION_TYPES.MANUAL && CONDITION_INPUT_CONFIG[conditionType] && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Label htmlFor="condition-value">
              {CONDITION_INPUT_CONFIG[conditionType].label}
            </Label>
            <div className="flex gap-2 items-center mt-1">
              <Input
                id="condition-value"
                type={CONDITION_INPUT_CONFIG[conditionType].type}
                min={CONDITION_INPUT_CONFIG[conditionType].min}
                max={CONDITION_INPUT_CONFIG[conditionType].max}
                step={CONDITION_INPUT_CONFIG[conditionType].step}
                placeholder={CONDITION_INPUT_CONFIG[conditionType].placeholder}
                value={conditionData?.[CONDITION_INPUT_CONFIG[conditionType].field] || ''}
                onChange={(e) => setConditionData({
                  ...conditionData,
                  [CONDITION_INPUT_CONFIG[conditionType].field]: e.target.value
                })}
                className="flex-1"
              />
              {CONDITION_INPUT_CONFIG[conditionType].suffix && (
                <span className="text-sm text-gray-600">
                  {CONDITION_INPUT_CONFIG[conditionType].suffix}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 미리보기 */}
      <div>
        <Label>미리보기</Label>
        <Card className="p-6 w-40 mx-auto mt-2 hover:shadow-lg transition-shadow">
          <div className="text-5xl text-center mb-3">{icon}</div>
          <h3 className="text-sm font-semibold text-center truncate">
            {name || '배지 이름'}
          </h3>
          <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
            {description || '배지 설명'}
          </p>
          <div className="flex justify-center mt-3">
            <span className={`text-xs px-3 py-1 rounded-full ${
              TIER_OPTIONS.find(t => t.value === tier)?.color || 'bg-gray-100'
            }`}>
              {TIER_OPTIONS.find(t => t.value === tier)?.label || '입문'}
            </span>
          </div>
        </Card>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} type="button">
            취소
          </Button>
        )}
        <Button onClick={handleSave} type="button">
          {initialBadge ? '수정 완료' : '배지 만들기'}
        </Button>
      </div>
    </div>
  );
}
