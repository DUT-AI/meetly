'use client';

import { Check, CheckSquare, Search, Square, Users, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { cn } from '@/lib/utils';

export interface AssigneeMemberOption {
  id: string;
  userId?: string | number;
  name: string;
  email?: string;
  imageUrl?: string;
  teams?: string[];
}

interface TeamAssigneeSelectorProps {
  memberOptions: AssigneeMemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

interface TeamConfig {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
}

const CANONICAL_TEAMS: TeamConfig[] = [
  {
    key: 'Trainer',
    label: 'Trainer',
    shortLabel: 'Trainer',
    icon: '🧑‍🏫',
  },
  {
    key: 'HR',
    label: 'HR',
    shortLabel: 'HR',
    icon: '👥',
  },
  {
    key: 'Marcom',
    label: 'Marcom',
    shortLabel: 'Marcom',
    icon: '📢',
  },
  {
    key: 'Educator',
    label: 'Educator',
    shortLabel: 'Educator',
    icon: '🎓',
  },
  {
    key: 'Project Developer',
    label: 'Project Developer',
    shortLabel: 'Project Dev',
    icon: '💻',
  },
];

// Fallback mapping by member name or user_id for resilient team resolution
function resolveMemberTeams(member: AssigneeMemberOption): string[] {
  const result = new Set<string>();

  // 1. Check explicit teams array from API
  if (Array.isArray(member.teams)) {
    for (const t of member.teams) {
      for (const ct of CANONICAL_TEAMS) {
        if (ct.key.toLowerCase() === t.toLowerCase()) {
          result.add(ct.key);
        }
      }
    }
  }

  const name = (member.name || '').toLowerCase().trim();
  const uid = String(member.userId || '');

  // 2. Specific mapping for DUT AI members
  // Trainer
  if (
    uid in { '4': 1, '26': 1, '10': 1, '14': 1, '22': 1, '25': 1, '32': 1, '1': 1, '9': 1, '19': 1, '8': 1, '16': 1 } ||
    name.includes('đắc trí') ||
    name.includes('văn lộc') ||
    name.includes('anh tú') ||
    name.includes('hoài như') ||
    name.includes('ngọc huyền') ||
    name.includes('quang thái') ||
    name.includes('vũ long') ||
    name.includes('phước nguyên') ||
    name.includes('hoàng minh') ||
    name.includes('tấn sơn') ||
    name.includes('thành danh') ||
    name.includes('cao cường')
  ) {
    result.add('Trainer');
  }

  // HR
  if (
    uid in { '17': 1, '22': 1, '23': 1, '25': 1, '3': 1 } ||
    name.includes('tuyết trinh') ||
    name.includes('ngọc huyền') ||
    name.includes('quang bình') ||
    name.includes('quang thái') ||
    name.includes('thảo nguyên')
  ) {
    result.add('HR');
  }

  // Marcom
  if (
    uid in { '27': 1, '15': 1, '34': 1, '35': 1, '3': 1 } ||
    name.includes('khắc bình') ||
    name.includes('hữu dũng') ||
    name.includes('xuân vũ') ||
    name.includes('lê vy')
  ) {
    result.add('Marcom');
  }

  // Educator
  if (
    uid in { '7': 1, '11': 1, '32': 1, '31': 1, '19': 1 } ||
    name.includes('hữu rin') ||
    name.includes('tài danh') ||
    name.includes('vũ long') ||
    name.includes('khánh linh') ||
    name.includes('tấn sơn')
  ) {
    result.add('Educator');
  }

  // Project Developer
  if (
    uid in { '10': 1, '12': 1, '14': 1, '9': 1, '20': 1, '28': 1 } ||
    name.includes('anh tú') ||
    name.includes('duy toàn') ||
    name.includes('hoài như') ||
    name.includes('hoàng minh') ||
    name.includes('phú quý') ||
    name.includes('văn chương')
  ) {
    result.add('Project Developer');
  }

  return Array.from(result);
}

export const TeamAssigneeSelector: React.FC<TeamAssigneeSelectorProps> = ({
  memberOptions,
  selectedIds = [],
  onChange,
  disabled = false,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('Trainer');
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to top of member list when switching teams or searching
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [selectedTeam, searchQuery]);

  // Map each member with their assigned teams
  const enrichedMembers = useMemo(() => {
    return memberOptions.map((m) => ({
      ...m,
      resolvedTeams: resolveMemberTeams(m),
    }));
  }, [memberOptions]);

  // Group members into team lookup
  const teamMembersMap = useMemo(() => {
    const map = new Map<string, typeof enrichedMembers>();
    for (const team of CANONICAL_TEAMS) {
      map.set(team.key, []);
    }
    for (const m of enrichedMembers) {
      for (const t of m.resolvedTeams) {
        const list = map.get(t);
        if (list) {
          list.push(m);
        }
      }
    }
    return map;
  }, [enrichedMembers]);

  // Count of selected members for each team
  const teamSelectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const team of CANONICAL_TEAMS) {
      const members = teamMembersMap.get(team.key) || [];
      counts[team.key] = members.filter((m) => selectedIds.includes(m.id)).length;
    }
    return counts;
  }, [teamMembersMap, selectedIds]);

  // Members to display based on selected team tab & search query
  const displayedMembers = useMemo(() => {
    let list: typeof enrichedMembers;
    if (selectedTeam === 'all') {
      list = enrichedMembers;
    } else {
      list = teamMembersMap.get(selectedTeam) || [];
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        m.resolvedTeams.some((t) => t.toLowerCase().includes(q)),
    );
  }, [selectedTeam, enrichedMembers, teamMembersMap, searchQuery]);

  // Toggle single member
  const toggleMember = (memberId: string) => {
    const next = selectedIds.includes(memberId)
      ? selectedIds.filter((id) => id !== memberId)
      : [...selectedIds, memberId];
    onChange(next);
  };

  // Toggle all members in currently active team view
  const activeTeamMembers = useMemo(() => {
    if (selectedTeam === 'all') return enrichedMembers;
    return teamMembersMap.get(selectedTeam) || [];
  }, [selectedTeam, enrichedMembers, teamMembersMap]);

  const areAllActiveTeamSelected = useMemo(() => {
    if (activeTeamMembers.length === 0) return false;
    return activeTeamMembers.every((m) => selectedIds.includes(m.id));
  }, [activeTeamMembers, selectedIds]);

  const toggleAllInActiveTeam = () => {
    const activeIds = activeTeamMembers.map((m) => m.id);
    if (areAllActiveTeamSelected) {
      // Unselect all active team members
      onChange(selectedIds.filter((id) => !activeIds.includes(id)));
    } else {
      // Select all active team members
      onChange(Array.from(new Set([...selectedIds, ...activeIds])));
    }
  };

  // Selected members for trigger display
  const selectedMembers = useMemo(() => {
    return memberOptions.filter((m) => selectedIds.includes(m.id));
  }, [memberOptions, selectedIds]);

  const activeTeamConfig = useMemo(() => {
    return CANONICAL_TEAMS.find((t) => t.key === selectedTeam);
  }, [selectedTeam]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal h-10 px-3 hover:bg-accent/40"
        >
          {selectedMembers.length === 0 && (
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm truncate">
              <Users className="size-4 opacity-50 shrink-0" />
              Chọn người thực hiện (chọn theo team)
            </span>
          )}

          {selectedMembers.length > 0 && (
            <div className="flex items-center gap-2 overflow-hidden w-full justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <div className="flex -space-x-2 overflow-hidden shrink-0">
                  {selectedMembers.slice(0, 3).map((m) => (
                    <MemberAvatar
                      key={m.id}
                      className="size-6 border-2 border-background ring-1 ring-border"
                      name={m.name}
                      image={m.imageUrl}
                    />
                  ))}
                </div>

                <span className="truncate text-xs font-medium text-foreground">
                  {selectedMembers.map((m) => m.name).join(', ')}
                </span>
              </div>

              <Badge variant="secondary" className="text-[11px] font-semibold px-1.5 h-5 shrink-0">
                {selectedMembers.length}
              </Badge>
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        className="w-[340px] sm:w-[380px] p-0 z-50 shadow-2xl border bg-popover text-popover-foreground rounded-xl overflow-hidden flex flex-col"
      >
        {/* Header: Team Tabs */}
        <div className="p-2.5 border-b bg-muted/20 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Chọn team để xem thành viên:</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-muted-foreground hover:text-rose-600 underline font-medium cursor-pointer"
              >
                Bỏ chọn tất cả ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Team Tabs Row */}
          <div className="grid grid-cols-3 gap-1">
            {CANONICAL_TEAMS.map((team) => {
              const isCurrent = selectedTeam === team.key;
              const selectedCount = teamSelectedCounts[team.key] || 0;
              const totalCount = (teamMembersMap.get(team.key) || []).length;

              return (
                <button
                  key={team.key}
                  type="button"
                  onClick={() => setSelectedTeam(team.key)}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer text-left',
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-accent text-foreground border-border/80',
                  )}
                >
                  <span className="truncate flex items-center gap-1">
                    <span>{team.icon}</span>
                    <span className="truncate">{team.shortLabel}</span>
                  </span>
                  {selectedCount > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-1 py-0.2 rounded-full font-bold shrink-0 ml-1',
                        isCurrent ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary',
                      )}
                    >
                      {selectedCount}
                    </span>
                  )}
                  {selectedCount === 0 && (
                    <span className={cn('text-[10px] shrink-0 ml-1 opacity-60')}>
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* All members tab */}
            <button
              type="button"
              onClick={() => setSelectedTeam('all')}
              className={cn(
                'flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer',
                selectedTeam === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background hover:bg-accent text-foreground border-border/80',
              )}
            >
              <span>🌐</span>
              <span>Tất cả ({enrichedMembers.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Tìm trong ${selectedTeam === 'all' ? 'tất cả thành viên' : `team ${activeTeamConfig?.label || ''}`}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Toolbar for Current Active Team */}
        <div className="px-3 py-1.5 bg-muted/40 border-b flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            {activeTeamConfig ? (
              <>
                <span>{activeTeamConfig.icon}</span>
                <span>Team {activeTeamConfig.label}</span>
                <span className="text-muted-foreground text-[11px]">({activeTeamMembers.length} bạn)</span>
              </>
            ) : (
              <>
                <span>🌐</span>
                <span>Tất cả thành viên</span>
                <span className="text-muted-foreground text-[11px]">({activeTeamMembers.length} bạn)</span>
              </>
            )}
          </div>

          {activeTeamMembers.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAllInActiveTeam}
              className="h-6 px-1.5 text-[11px] font-medium text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
            >
              {areAllActiveTeamSelected ? (
                <span className="flex items-center gap-1 text-rose-600">
                  <CheckSquare className="size-3" />
                  Bỏ chọn cả team
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Square className="size-3" />
                  Chọn cả team
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Member List - compact to 3 members with smooth mouse wheel scroll */}
        <div
          ref={listRef}
          onWheel={(e) => e.stopPropagation()}
          className="h-[138px] overflow-y-auto custom-scrollbar p-1.5 space-y-1 scroll-smooth"
        >
          {displayedMembers.map((member) => {
            const isSelected = selectedIds.includes(member.id);

            return (
              <div
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs select-none',
                  isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/60 text-foreground',
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MemberAvatar className="size-6 shrink-0" name={member.name} image={member.imageUrl} />
                  <div className="truncate">
                    <span className="truncate block leading-tight font-medium">{member.name}</span>
                    {member.email && (
                      <span className="text-[10px] text-muted-foreground truncate block leading-none mt-0.5">
                        {member.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 ml-2 flex items-center gap-1.5">
                  {isSelected ? (
                    <div className="size-4 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="size-4 rounded border border-muted-foreground/40 hover:border-foreground" />
                  )}
                </div>
              </div>
            );
          })}

          {displayedMembers.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Không tìm thấy thành viên nào trong danh sách
            </div>
          )}
        </div>

        {/* Footer: Done button */}
        <div className="p-2 border-t bg-muted/20 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Đã chọn <strong className="text-foreground">{selectedMembers.length}</strong> thành viên
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-3 text-xs font-semibold cursor-pointer"
          >
            Xong
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
