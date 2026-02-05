import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function InputInline() {
  return (
    <Field
      orientation="horizontal"
      className="max-w-3xl w-full shadow-lg rounded-xl p-2 border bg-background"
    >
      <Input
        type="search"
        placeholder="Search..."
        className="h-12 text-lg border-0 shadow-none focus-visible:ring-0 px-4"
      />
      <Button size="lg" className="h-10 px-6 rounded-lg">
        Search
      </Button>
    </Field>
  );
}
