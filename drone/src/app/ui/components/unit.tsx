import { UnitData } from '@/app/lib/data/units';

export default function UnitComponent({ id, title, sub_units, description }: UnitData) {
    return (
        <div key={id} className="p-4 md:p-8 mb-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">{title}</h1>
            
            {description && <p className="text-gray-700 mb-6">{description}</p>}

            {sub_units && sub_units.length > 0 && (
                <>
                    <h2 className="text-2xl font-semibold mt-8 mb-4 border-t pt-4">Sub-Units</h2>
                    <ul className="list-disc list-inside space-y-2">
                        {sub_units.map((sub_unit) => (
                            <li key={sub_unit.id} className="text-gray-800">{sub_unit.title}</li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}