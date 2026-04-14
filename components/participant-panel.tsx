"use client";

import { useState } from "react";
import { X, Plus, Users, Settings2, Shuffle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface Participant {
  id: string;
  name: string;
  weight: number;
  included: boolean;
}

interface ParticipantPanelProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  showAdmin: boolean;
  setShowAdmin: (show: boolean) => void;
  allowAdminControls?: boolean;
}

const QUICK_ADD_NAMES = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"];

export function ParticipantPanel({
  participants,
  setParticipants,
  showAdmin,
  setShowAdmin,
  allowAdminControls = true,
}: ParticipantPanelProps) {
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addParticipant = () => {
    if (newName.trim()) {
      setIsAdding(true);
      setParticipants((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: newName.trim(),
          weight: 1,
          included: true,
        },
      ]);
      setNewName("");
      setTimeout(() => setIsAdding(false), 300);
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleParticipant = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, included: !p.included } : p))
    );
  };

  const updateWeight = (id: string, weight: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, weight } : p))
    );
  };

  const shuffleParticipants = () => {
    setParticipants((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const totalWeight = participants
    .filter((p) => p.included)
    .reduce((sum, p) => sum + p.weight, 0);
  const visibleParticipants = allowAdminControls
    ? participants
    : participants.filter((p) => p.included);

  const getProbability = (participant: Participant) => {
    if (!participant.included || totalWeight === 0) return 0;
    return (participant.weight / totalWeight) * 100;
  };

  const activeCount = participants.filter((p) => p.included).length;
  const totalCount = visibleParticipants.length;

  return (
    <div 
      className="relative rounded-3xl p-6 w-full max-w-sm h-fit overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(15, 15, 25, 0.8) 0%, rgba(20, 20, 35, 0.6) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 240, 255, 0.1)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-xl blur-lg" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/30">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-orbitron)] text-lg font-bold text-white">
              Participants
            </h2>
            <p className="text-xs text-white/50">
              <span className="text-cyan-400">{activeCount}</span> of {totalCount} active
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Shuffle button */}
          {totalCount > 1 && (
            <button
              onClick={shuffleParticipants}
              className="p-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/10"
              title="Shuffle order"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}
          
          {allowAdminControls && showAdmin && (
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold tracking-wider">
              ADMIN
            </span>
          )}
          {allowAdminControls && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdmin(!showAdmin)}
              title="Toggle admin mode (control weights)"
              className={`rounded-xl transition-all ${
                showAdmin
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              <Settings2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Add participant input */}
      <div className="relative flex gap-2 mb-5">
        <div className="relative flex-1">
          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            placeholder="Enter name..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20 rounded-xl h-12"
          />
        </div>
        <Button
          onClick={addParticipant}
          disabled={!newName.trim()}
          className={`bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-bold rounded-xl px-5 h-12 disabled:opacity-30 transition-all ${
            isAdding ? "scale-95" : "hover:scale-105"
          }`}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Participant list */}
      <ScrollArea className="h-[260px] sm:h-[340px] pr-2 -mr-2">
        <div className="space-y-2.5 pr-2">
          {visibleParticipants.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center border border-white/5">
                <Users className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/50 font-medium">No participants yet</p>
              <p className="text-white/30 text-sm mt-1">Add names to get started</p>
            </div>
          ) : (
            visibleParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                  participant.included
                    ? "bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-500/30"
                    : "bg-white/[0.02] opacity-60 border border-transparent"
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Toggle switch - Admin only */}
                  {allowAdminControls && showAdmin && (
                    <Switch
                      checked={participant.included}
                      onCheckedChange={() => toggleParticipant(participant.id)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500 data-[state=checked]:to-purple-500"
                    />
                  )}

                  {/* Name and probability */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-semibold truncate ${
                          participant.included ? "text-white" : "text-white/50"
                        }`}
                      >
                        {participant.name}
                      </p>
                      {!participant.included && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-medium uppercase tracking-wider">
                          excluded
                        </span>
                      )}
                    </div>
                    
                    {/* Probability bar */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500"
                          style={{ 
                            width: `${getProbability(participant)}%`,
                            boxShadow: participant.included ? "0 0 10px rgba(0, 240, 255, 0.5)" : "none",
                          }}
                        />
                      </div>
                      <span className={`text-xs font-mono w-14 text-right ${
                        participant.included ? "text-cyan-400" : "text-white/30"
                      }`}>
                        {getProbability(participant).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Remove button - Always visible for all users */}
                  <button
                    onClick={() => removeParticipant(participant.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all hover:scale-110"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Weight slider (admin mode) */}
                {allowAdminControls && showAdmin && participant.included && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/50 font-medium">Weight multiplier</span>
                      <span className="text-sm text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded-lg">
                        {participant.weight.toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[participant.weight]}
                      onValueChange={([value]) =>
                        updateWeight(participant.id, value)
                      }
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-cyan-500 [&_[data-slot=slider-range]]:to-purple-500 [&_[data-slot=slider-thumb]]:border-cyan-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick add suggestions */}
      {visibleParticipants.length === 0 && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs text-white/40 mb-3 font-medium">Quick add demo names:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_NAMES.map((name) => (
              <button
                key={name}
                onClick={() =>
                  setParticipants((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      name,
                      weight: 1,
                      included: true,
                    },
                  ])
                }
                className="px-3.5 py-1.5 text-xs bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 text-white/70 hover:text-white rounded-full border border-white/10 hover:border-cyan-500/30 transition-all hover:scale-105"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats footer */}
      {visibleParticipants.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Total participants: {totalCount}</span>
        </div>
      )}
    </div>
  );
}
