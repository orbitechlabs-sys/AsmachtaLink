import {
  listCertifications,
  listPrerequisites,
  listQuotas,
  listTaxes,
} from "@/lib/db/repositories/certifications";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { listReserveForCertification, listRosterForCertification } from "@/lib/db/repositories/roster";
import type { CertificationStatus, RosterStatus } from "@/lib/types";

export interface ExportRosterEntry {
  full_name: string;
  personal_number: string;
  phone: string | null;
  company_platoon: string | null;
  battalion_name?: string;
  status: RosterStatus;
}

export interface ExportBattalionGroup {
  battalion_id: number;
  battalion_name: string;
  battalion_color: string;
  quota: number | null;
  registered: ExportRosterEntry[];
}

export interface ExportCertification {
  id: number;
  name: string;
  domain: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  status: CertificationStatus;
  total_slots: number | null;
  registered_count: number;
  prerequisites: string[];
  taxes: { role_name: string; is_fulfilled: boolean }[];
  battalionGroups: ExportBattalionGroup[];
  reserve: ExportRosterEntry[];
}

export async function getExportData(from: string, to: string): Promise<ExportCertification[]> {
  const [allCerts, battalions] = await Promise.all([listCertifications({ from, to }), listBattalions()]);
  const certs = allCerts.filter((c) => c.status !== "cancelled");
  const battalionMap = new Map(battalions.map((b) => [b.id, b]));

  return Promise.all(certs.map(async (cert) => {
    const [quotas, roster, reserve, taxes, prerequisites] = await Promise.all([
      listQuotas(cert.id),
      listRosterForCertification(cert.id),
      listReserveForCertification(cert.id),
      listTaxes(cert.id),
      listPrerequisites(cert.id),
    ]);

    const groupByBattalion = new Map<number, ExportBattalionGroup>();
    for (const q of quotas) {
      const b = battalionMap.get(q.battalion_id);
      if (!b) continue;
      groupByBattalion.set(q.battalion_id, {
        battalion_id: q.battalion_id,
        battalion_name: b.name,
        battalion_color: b.color_hex,
        quota: q.allocated_slots,
        registered: [],
      });
    }
    for (const entry of roster) {
      let group = groupByBattalion.get(entry.battalion_id);
      if (!group) {
        const b = battalionMap.get(entry.battalion_id);
        group = {
          battalion_id: entry.battalion_id,
          battalion_name: b?.name ?? "לא ידוע",
          battalion_color: b?.color_hex ?? "#64748b",
          quota: null,
          registered: [],
        };
        groupByBattalion.set(entry.battalion_id, group);
      }
      group.registered.push({
        full_name: entry.full_name,
        personal_number: entry.personal_number,
        phone: entry.phone,
        company_platoon: entry.company_platoon,
        status: entry.status,
      });
    }

    return {
      id: cert.id,
      name: cert.name,
      domain: cert.domain,
      location: cert.location,
      start_date: cert.start_date,
      end_date: cert.end_date,
      status: cert.status,
      total_slots: cert.total_slots,
      registered_count: cert.registered_count,
      prerequisites: prerequisites.map((p) => p.description),
      taxes: taxes.map((t) => ({ role_name: t.role_name, is_fulfilled: t.is_fulfilled === 1 })),
      battalionGroups: Array.from(groupByBattalion.values()).sort((a, b) =>
        a.battalion_name.localeCompare(b.battalion_name)
      ),
      reserve: reserve.map((entry) => ({
        full_name: entry.full_name,
        personal_number: entry.personal_number,
        phone: entry.phone,
        company_platoon: entry.company_platoon,
        battalion_name: battalionMap.get(entry.battalion_id)?.name,
        status: entry.status,
      })),
    };
  }));
}
