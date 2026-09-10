import NavDesktop from "./NavDesktop";
import NavMobile from "./NavMobile";

// lg(1024px) 기준으로 CSS만으로 분기 — window 훅 기반 분기는 SSR 깜빡임이 생겨서 안 씀
// (inote-money에서 이미 검증된 전략, PLANNING.md 참고)
export default function Nav() {
  return (
    <>
      <div className="block lg:hidden">
        <NavMobile />
      </div>
      <div className="hidden lg:block">
        <NavDesktop />
      </div>
    </>
  );
}
