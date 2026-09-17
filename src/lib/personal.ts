import { getCollection, type CollectionEntry } from 'astro:content';
import { staffCategoryIds, staffCategoryLabels, staffGroupIds, staffGroupLabels } from '../data/personal';

export type StaffMember = CollectionEntry<'personal'>;

export async function getStaffSections() {
  const members = (await getCollection('personal')).sort((a, b) => a.data.order - b.data.order);
  if (!members.length) throw new Error('El directorio institucional está vacío.');

  // A person may have several roles, but must keep one local portrait.
  const portraits = new Map<string, string>();
  const positions = new Set<number>();
  for (const { id, data } of members) {
    const previous = portraits.get(data.personId);
    if (previous && previous !== data.photo.src) throw new Error(`Fotografías distintas para ${data.personId}.`);
    if (positions.has(data.order)) throw new Error(`Orden de personal repetido: ${id}.`);
    portraits.set(data.personId, data.photo.src);
    positions.add(data.order);
  }

  return staffCategoryIds.map(id => {
    const categoryMembers = members.filter(member => member.data.category === id);
    return {
      id,
      title: staffCategoryLabels[id],
      members: categoryMembers,
      groups: id === 'docentes'
        ? staffGroupIds.map(group => ({
          id: group,
          title: staffGroupLabels[group],
          members: categoryMembers.filter(member => member.data.group === group),
        })).filter(group => group.members.length)
        : [],
    };
  }).filter(section => section.members.length);
}

export type StaffSectionData = Awaited<ReturnType<typeof getStaffSections>>[number];
