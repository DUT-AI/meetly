'use client';

import { Check, CheckSquare, Search, Square, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
  icon: string;
  colorClass: string;
  badgeClass: string;
}

const CANONICAL_TEAMS: TeamConfig[] = [
  {
    key: 'Trainer',
    label: 'Trainer',
    icon: '🧑‍🏫',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeClass: 'hover:bg-blue-100 data-[selected=true]:bg-blue-600 data-[selected=true]:text-white',
  },
  {
    key: 'HR',
    label: 'HR',
    icon: '👥',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeClass: 'hover:bg-emerald-100 data-[selected=true]:bg-emerald-600 data-[selected=true]:text-white',
  },
  {
    key: 'Marcom',
    label: 'Marcom',
    icon: '📢',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeClass: 'hover:bg-amber-100 data-[selected=true]:bg-amber-600 data-[selected=true]:text-white',
  },
  {
    key: 'Educator',
    label: 'Educator',
    icon: '🎓',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
    badgeClass: 'hover:bg-purple-100 data-[selected=true]:bg-purple-600 data-[selected=true]:text-white',
  },
  {
    key: 'Project Developer',
    label: 'Project Developer',
    icon: '💻',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    badgeClass: 'hover:bg-indigo-100 data-[selected=true]:bg-indigo-600 data-[selected=true]:text-white',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Map each member with their assigned teams
  const enrichedMembers = useMemo(() => {
    return memberOptions.map((m) => ({
      ...m,
      resolvedTeams: resolveMemberTeams(m),
    }));
  }, [memberOptions]);

  // Group members into the 5 canonical teams + other
  const teamGroups = useMemo(() => {
    const map = new Map<string, typeof enrichedMembers>();
    for (const team of CANONICAL_TEAMS) {
      map.set(team.key, []);
    }
    const otherMembers: typeof enrichedMembers = [];

    for (const m of enrichedMembers) {
      if (m.resolvedTeams.length === 0) {
        otherMembers.push(m);
      } else {
        for (const t of m.resolvedTeams) {
          const list = map.get(t);
          if (list) {
            list.push(m);
          }
        }
      }
    }

    return { map, otherMembers };
  }, [enrichedMembers]);

  // Filter members by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return teamGroups;
    }

    const filteredMap = new Map<string, typeof enrichedMembers>();
    for (const team of CANONICAL_TEAMS) {
      const teamMatches = team.label.toLowerCase().includes(q);
      const members = (teamGroups.map.get(team.key) || []).filter(
        (m) => teamMatches || m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)),
      );
      filteredMap.set(team.key, members);
    }

    const filteredOther = teamGroups.otherMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)),
    );

    return { map: filteredMap, otherMembers: filteredOther };
  }, [teamGroups, searchQuery]);

  // Toggle single member
  const toggleMember = (memberId: string) => {
    const next = selectedIds.includes(memberId)
      ? selectedIds.filter((id) => id !== memberId)
      : [...selectedIds, memberId];
    onChange(next);
  };

  // Toggle entire team
  const toggleTeam = (teamKey: string) => {
    const membersInTeam = teamGroups.map.get(teamKey) || [];
    if (membersInTeam.length === 0) return;

    const teamMemberIds = membersInTeam.map((m) => m.id);
    const allSelected = teamMemberIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Unselect all members of this team
      const next = selectedIds.filter((id) => !teamMemberIds.includes(id));
      onChange(next);
    } else {
      // Add all missing members of this team
      const next = Array.from(new Set([...selectedIds, ...teamMemberIds]));
      onChange(next);
    }
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
  };

  // Selected members for trigger display
  const selectedMembers = useMemo(() => {
    return memberOptions.filter((m) => selectedIds.includes(m.id));
  }, [memberOptions, selectedIds]);

  // Check which teams are fully selected for trigger label
  const fullySelectedTeams = useMemo(() => {
    return CANONICAL_TEAMS.filter((t) => {
      const members = teamGroups.map.get(t.key) || [];
      return members.length > 0 && members.every((m) => selectedIds.includes(m.id));
    });
  }, [teamGroups, selectedIds]);

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
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Users className="size-4 opacity-50" />
              Chọn người thực hiện (hoặc chọn team)
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

                <div className="flex items-center gap-1.5 truncate text-xs">
                  {fullySelectedTeams.length > 0 && (
                    <span className="font-semibold text-primary">
                      {fullySelectedTeams.map((t) => t.label).join(', ')}
                      {fullySelectedTeams.length < 5 && selectedMembers.length > fullySelectedTeams.reduce((acc, t) => acc + (teamGroups.map.get(t.key)?.length || 0), 0) && ' + khác'}
                    </span>
                  )}
                  {fullySelectedTeams.length === 0 && (
                    <span className="truncate">{selectedMembers.map((m) => m.name).join(', ')}</span>
                  )}
                </div>
              </div>

              <Badge variant="secondary" className="text-[11px] font-semibold px-1.5 h-5 shrink-0">
                {selectedMembers.length}
              </Badge>
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-2.5 border-b space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Users className="size-3.5 text-muted-foreground" />
              Giao nhanh cho toàn Team:
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-muted-foreground hover:text-rose-600 underline font-medium cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>

          {/* Quick Team Chips */}
          <div className="flex flex-wrap gap-1.5">
            {CANONICAL_TEAMS.map((team) => {
              const members = teamGroups.map.get(team.key) || [];
              if (members.length === 0) return null;

              const memberIds = members.map((m) => m.id);
              const selectedCount = memberIds.filter((id) => selectedIds.includes(id)).length;
              const isAll = selectedCount === members.length;
              const isPartial = selectedCount > 0 && !isAll;

              return (
                <button
                  key={team.key}
                  type="button"
                  onClick={() => toggleTeam(team.key)}
                  data-selected={isAll}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                    isAll
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isPartial
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-background hover:bg-accent text-muted-foreground border-border',
                  )}
                  title={`Giao việc cho cả team ${team.label} (${members.length} bạn)`}
                >
                  <span>{team.icon}</span>
                  <span>{team.label}</span>
                  <span className={cn('text-[10px] ml-0.5 opacity-80', isAll ? 'text-primary-foreground' : 'text-muted-foreground')}>
                    ({selectedCount}/{members.length})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo tên thành viên hoặc team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Member List Grouped by Teams */}
        <div className="max-h-[340px] overflow-y-auto p-2 space-y-3">
          {CANONICAL_TEAMS.map((team) => {
            const members = filteredGroups.map.get(team.key) || [];
            if (members.length === 0) return null;

            const allTeamMemberIds = (teamGroups.map.get(team.key) || []).map((m) => m.id);
            const allSelected = allTeamMemberIds.length > 0 && allTeamMemberIds.every((id) => selectedIds.includes(id));
            const selectedCount = allTeamMemberIds.filter((id) => selectedIds.includes(id)).length;

            return (
              <div key={team.key} className="rounded-lg border border-border/60 overflow-hidden bg-card">
                {/* Team Section Header */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{team.icon}</span>
                    <span className="text-xs font-semibold">{team.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      ({selectedCount}/{allTeamMemberIds.length})
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTeam(team.key)}
                    className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    {allSelected ? (
                      <span className="flex items-center gap-1 text-rose-600">
                        <CheckSquare className="size-3" />
                        Bỏ chọn
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Square className="size-3" />
                        Chọn cả team
                      </span>
                    )}
                  </Button>
                </div>

                {/* Team Members List */}
                <div className="p-1 space-y-0.5">
                  {members.map((member) => {
                    const isSelected = selectedIds.includes(member.id);
                    return (
                      <div
                        key={`${team.key}-${member.id}`}
                        onClick={() => toggleMember(member.id)}
                        className={cn(
                          'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs',
                          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/60 text-foreground',
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MemberAvatar className="size-5 shrink-0" name={member.name} image={member.imageUrl} />
                          <div className="truncate">
                            <span className="truncate block leading-tight">{member.name}</span>
                            {member.email && (
                              <span className="text-[10px] text-muted-foreground truncate block leading-none">
                                {member.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isSelected ? (
                            <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="size-4 rounded-full border border-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Other Members (if any) */}
          {filteredGroups.otherMembers.length > 0 && (
            <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
              <div className="px-2.5 py-1.5 bg-muted/40 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Thành viên khác</span>
                <span className="text-[11px] text-muted-foreground">({filteredGroups.otherMembers.length})</span>
              </div>
              <div className="p-1 space-y-0.5">
                {filteredGroups.otherMembers.map((member) => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <div
                      key={`other-${member.id}`}
                      onClick={() => toggleMember(member.id)}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs',
                        isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent/60',
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MemberAvatar className="size-5 shrink-0" name={member.name} image={member.imageUrl} />
                        <span className="truncate">{member.name}</span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="size-4 rounded-full border border-muted-foreground/30" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {CANONICAL_TEAMS.every((t) => (filteredGroups.map.get(t.key) || []).length === 0) &&
            filteredGroups.otherMembers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Không tìm thấy thành viên phù hợp</p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

