// Fix-safety fixture: conditional returns the rule autofixes.
export function Balanced(props: { big: boolean }) {
  return props.big ? <div>Big!</div> : <div>Small!</div>;
}

export function WithFallback(props: { big: boolean }) {
  return props.big ? (
    <div>
      Big!
      No, really big!
    </div>
  ) : (
    <div>Small!</div>
  );
}

export function Logical(props: { show: boolean }) {
  return props.show && <div>Shown</div>;
}
