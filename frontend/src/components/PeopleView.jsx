const contacts = [
  {
    name: "Maya Patel",
    role: "Product Design",
    email: "maya@northstar.design",
    status: "Online",
  },
  {
    name: "Rohan Singh",
    role: "Operations Lead",
    email: "rohan@acmeops.io",
    status: "In meetings",
  },
  {
    name: "Azure Billing",
    role: "Vendor",
    email: "billing@microsoft.com",
    status: "Awaiting reply",
  },
  {
    name: "Lina Torres",
    role: "Frontend Engineer",
    email: "lina@officespace.app",
    status: "Reviewing tasks",
  },
];

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const PeopleView = () => {
  return (
    <section className="people-view-shell flex-1 bg-[#fbfdff] p-6">
      <div className="people-shell-card rounded-[28px] border border-[#dfe7f2] bg-white p-6 shadow-[0_22px_45px_rgba(27,44,74,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b9bb4]">
              People
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#1a2a42]">
              Workspace directory
            </h2>
          </div>
          <p className="text-sm text-[#7787a0]">
            4 collaborators active in your delivery workspace
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {contacts.map((person) => (
            <article
              key={person.email}
              className="people-contact-card rounded-[24px] border border-[#dfe7f2] bg-[#f7fafe] p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf3fd] text-lg font-semibold text-[#2473c1]">
                  {initials(person.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[18px] font-semibold text-[#1d2c45]">
                      {person.name}
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6c7c95]">
                      {person.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#7585a0]">{person.role}</p>
                  <p className="mt-3 text-sm font-medium text-[#2574c4]">{person.email}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PeopleView;
