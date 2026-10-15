import { getCollection, type CollectionEntry } from 'astro:content';
import { staffCategoryIds, staffCategoryLabels, staffGroupIds, staffGroupLabels } from '../data/personal';
import { assetImage } from '../data/asset-images';

type StaffEntry = CollectionEntry<'personal'>;
export type StaffMember = Omit<StaffEntry, 'data'> & { data: Omit<StaffEntry['data'], 'photo'> & { photo: ReturnType<typeof assetImage> } };

export async function getStaffSections() {
  const members: StaffMember[] = (await getCollection('personal', ({ data }) => data.visible))
    .map(member => ({ ...member, data: { ...member.data, photo: assetImage(member.data.photo) } }))
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));

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
