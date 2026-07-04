"use client"

import { Info, Sparkles, TrendingUp, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const goodHabits = [
  "너무 작지도 크지도 않은 적당한 크기의 커밋",
  "feat:, fix:, docs: 처럼 무엇을 바꿨는지 알 수 있는 명확한 메시지",
  "하루 몰아서 한 번이 아니라, 작업 중간중간 여러 번 커밋",
  "하루만 반짝이 아니라 여러 날 꾸준히 개발",
]

const lightWeightKinds = [
  { kind: "병합(merge) 커밋", note: "브랜치를 합치는 기록이라 낮게 반영돼요" },
  { kind: "되돌리기(revert)", note: "실수를 되돌리는 좋은 습관이지만 새 작업은 아니에요" },
  { kind: "의존성 업데이트 · 포맷팅", note: "필요한 작업이지만 기능 구현과는 성격이 달라요" },
]

export function ScoringExplainerDialog({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <Info className="h-3 w-3" />
            점수 계산법 보기
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-gold" />
            점수는 이렇게 계산돼요
          </DialogTitle>
          <DialogDescription>평가가 아니라 재미로 보는 참고 지표예요. 부담 갖지 않아도 괜찮아요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-positive">
              <TrendingUp className="h-3.5 w-3.5" />
              점수가 올라가는 습관
            </h3>
            <ul className="mt-1.5 space-y-1 text-[13px] text-muted-foreground">
              {goodHabits.map((habit) => (
                <li key={habit} className="flex gap-1.5">
                  <span className="text-positive">·</span>
                  {habit}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-foreground">관리성 커밋은 조금 낮게 반영돼요</h3>
            <ul className="mt-1.5 space-y-1.5">
              {lightWeightKinds.map((item) => (
                <li key={item.kind} className="rounded-lg border border-border/60 bg-background/40 p-2">
                  <p className="text-[13px] font-medium">{item.kind}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{item.note}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-muted-foreground">
              다만 실제 변경이 담긴 커밋이라면 병합이든 큰 커밋이든 항상 최소한의 점수는 받아요. 빈 커밋처럼 정말 의미가
              없는 경우만 0점이에요.
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />팀 점수는 인원 수에 맞게 보정돼요
            </h3>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              2인 팀과 4인 팀을 그냥 더한 값으로 비교하면 인원이 많은 팀이 유리해지겠죠. 그래서 팀 규모에 따라
              자연스럽게 보정해서, 팀원 수와 상관없이 비교적 공정하게 비교할 수 있게 했어요. 또 팀원 중 한 명에게만
              몰리지 않고 골고루 기여했는지도 살짝 반영돼요.
            </p>
          </section>

          <p className="border-t border-border/60 pt-3 text-[12px] text-muted-foreground">
            결국 이 점수가 보고 싶은 건 딱 하나예요 — 커밋 개수가 아니라, 좋은 개발 리듬으로 즐겁게 만들었는지예요.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
