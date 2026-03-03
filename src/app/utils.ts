import { jsPDF } from 'jspdf';
import { Transaction } from './AppContext';
import { format } from 'date-fns';

export async function generateReceipt(tx: Transaction, type: 'client' | 'china', receiptSettings?: { style: number; headerImage: string | null }) {
    // Format "Ticket de caisse" (Reçu imprimante thermique 80mm de largeur)
    const doc = new jsPDF('p', 'mm', [80, 160]);
    const style = receiptSettings?.style || 1;
    const headerImage = receiptSettings?.headerImage;

    let startY = 10;
    const margin = 5;
    const width = 70;
    const centerX = 40;

    // Header image handling
    if (headerImage) {
        try {
            // Center the image
            doc.addImage(headerImage, 'PNG', 15, startY, 50, 20);
            startY = 35;
        } catch (e) {
            console.error('Erreur lors de l\'ajout de l\'image', e);
        }
    } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', style === 3 ? 'italic' : 'bold');
        doc.setTextColor(style === 3 ? 150 : 15, style === 3 ? 20 : 23, style === 3 ? 20 : 42);
        doc.text('TransApp', centerX, startY + 5, { align: 'center' });
        startY = 20;
    }

    if (style === 1) {
        // STYLE 1: Informatique / Thermique Classique
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(margin, startY, width, 10);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(`REÇU : #${tx.ref}`, margin + 2, startY + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date : ${format(new Date(tx.date), 'dd/MM/yyyy HH:mm')}`, margin + 2, startY + 8);

        if (type === 'client') {
            doc.rect(margin, startY + 10, width, 55);
            doc.setFont('helvetica', 'bold');
            doc.text('EXPÉDITEUR', margin + 2, startY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${tx.name}`, margin + 2, startY + 20);
            doc.text(`Destination : Chine`, margin + 2, startY + 25);

            doc.setFont('helvetica', 'bold');
            doc.text(`BÉNÉFICIAIRE`, margin + 2, startY + 32);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${tx.receiverName}`, margin + 2, startY + 37);
            doc.text(`Compte : ${tx.receiverAccount}`, margin + 2, startY + 42);

            doc.rect(margin, startY + 65, width, 25);
            doc.setFont('helvetica', 'bold');
            doc.text('FINANCES', margin + 2, startY + 70);
            doc.setFont('helvetica', 'normal');
            doc.text(`Montant envoyé :`, margin + 2, startY + 75);
            doc.text(`${tx.amount.toLocaleString()} FCFA`, margin + width - 2, startY + 75, { align: 'right' });
            doc.text(`Taux d'échange :`, margin + 2, startY + 80);
            doc.text(`${tx.rate}`, margin + width - 2, startY + 80, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text(`Montant à payer :`, margin + 2, startY + 86);
            doc.text(`${(tx.amount / tx.rate).toFixed(2)} CNY`, margin + width - 2, startY + 86, { align: 'right' });
        } else {
            doc.rect(margin, startY + 10, width, 30);
            doc.setFont('helvetica', 'bold');
            doc.text('INFOS BÉNÉFICIAIRE', margin + 2, startY + 15);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${tx.receiverName}`, margin + 2, startY + 21);
            doc.text(`Compte : ${tx.receiverAccount}`, margin + 2, startY + 27);
            doc.setFont('helvetica', 'bold');
            doc.text(`À créditer : ${(tx.amount / tx.rate).toFixed(2)} CNY`, margin + 2, startY + 35);
        }

    } else if (style === 2) {
        // STYLE 2: Moderne / Ligne épurée
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text(`Reçu de transfert`, centerX, startY, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Réf: ${tx.ref} • ${format(new Date(tx.date), 'dd MMM yyyy, HH:mm')}`, centerX, startY + 4, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, startY + 6, margin + width, startY + 6);

        if (type === 'client') {
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(margin, startY + 10, width, 25, 2, 2, 'F');

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`+ ${(tx.amount / tx.rate).toFixed(2)} CNY`, centerX, startY + 20, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Envoyé à : ${tx.receiverName}`, centerX, startY + 27, { align: 'center' });

            doc.setFontSize(9);
            doc.text('Détails de la transaction', margin, startY + 45);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Expéditeur : ${tx.name}`, margin, startY + 52);
            doc.text(`Compte bénéficiaire : ${tx.receiverAccount}`, margin, startY + 58);
            doc.text(`Montant (FCFA) : ${tx.amount.toLocaleString()}`, margin, startY + 64);
            doc.text(`Taux appliqué : ${tx.rate}`, margin, startY + 70);
        } else {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${(tx.amount / tx.rate).toFixed(2)} CNY`, centerX, startY + 20, { align: 'center' });
            doc.setFontSize(9);
            doc.text('Bénéficiaire Chine', margin, startY + 35);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nom : ${tx.receiverName}`, margin, startY + 42);
            doc.text(`Compte : ${tx.receiverAccount}`, margin, startY + 48);
        }

    } else {
        // STYLE 3: Premium / Élégant
        doc.setDrawColor(200, 50, 50); // Ligne rouge
        doc.setLineWidth(0.5);
        doc.line(centerX - 10, startY, centerX + 10, startY);

        doc.setFontSize(11);
        doc.setFont('times', 'italic');
        doc.setTextColor(0);
        doc.text('Reçu de Confirmation', centerX, startY + 6, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('times', 'normal');
        doc.setTextColor(80);
        doc.text(`Référence : ${tx.ref}`, centerX, startY + 12, { align: 'center' });
        doc.text(`Date : ${format(new Date(tx.date), 'dd/MM/yyyy HH:mm')}`, centerX, startY + 16, { align: 'center' });

        doc.setDrawColor(220);
        doc.setLineWidth(0.2);

        if (type === 'client') {
            doc.rect(margin, startY + 22, width, 55);

            doc.setFontSize(9);
            doc.setFont('times', 'bold');
            doc.setTextColor(0);
            doc.text('PARTIES', margin + 5, startY + 28);
            doc.setFontSize(8);
            doc.setFont('times', 'normal');
            doc.text(`De : ${tx.name}`, margin + 5, startY + 34);
            doc.text(`À : ${tx.receiverName}`, margin + 5, startY + 40);
            doc.text(`Compte : ${tx.receiverAccount}`, margin + 5, startY + 44);

            doc.setFont('times', 'bold');
            doc.setFontSize(9);
            doc.text('MONTANTS', margin + 5, startY + 54);
            doc.setFontSize(8);
            doc.setFont('times', 'normal');
            doc.text(`Débit : ${tx.amount.toLocaleString()} FCFA`, margin + 5, startY + 60);
            doc.setFont('times', 'bold');
            doc.text(`Crédit : ${(tx.amount / tx.rate).toFixed(2)} CNY`, margin + 5, startY + 68);
        } else {
            doc.rect(margin, startY + 22, width, 30);
            doc.setFontSize(9);
            doc.setFont('times', 'bold');
            doc.setTextColor(0);
            doc.text('BÉNÉFICIAIRE', margin + 5, startY + 28);
            doc.setFontSize(8);
            doc.setFont('times', 'normal');
            doc.text(`Nom : ${tx.receiverName}`, margin + 5, startY + 34);
            doc.text(`Compte : ${tx.receiverAccount}`, margin + 5, startY + 40);
            doc.setFont('times', 'bold');
            doc.text(`Crédit : ${(tx.amount / tx.rate).toFixed(2)} CNY`, margin + 5, startY + 48);
        }
    }

    // Common Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text('Ce document est généré électroniquement', centerX, 150, { align: 'center' });
    doc.text('et tient lieu de justificatif absolu.', centerX, 153, { align: 'center' });

    // Output blob instead of save
    const blob = doc.output('blob');
    return blob;
}

export async function handleShareReceipt(tx: Transaction, type: 'client' | 'china', receiptSettings?: { style: number; headerImage: string | null }) {
    const blob = await generateReceipt(tx, type, receiptSettings);
    const fileName = `Recu_${type}_${tx.ref}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    // Fallback URL mechanism
    const fileURL = URL.createObjectURL(blob);

    // Attempt native share API first (mostly for mobile/Safari)
    try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Reçu de Transfert',
                text: `Voici votre reçu de transfert #${tx.ref}`,
            });
            return; // Exit if share was successful
        }
    } catch (e) {
        console.log("Share API blocked or failed, falling back to download/open");
    }

    // Fallback: Open in new tab or Download
    try {
        const opened = window.open(fileURL, '_blank');
        if (!opened) {
            // Popup blocker prevented it, force download instead
            const link = document.createElement('a');
            link.href = fileURL;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (e) {
        console.error("Window.open failed", e);
    }

    // Revoke Object URL to free memory later
    setTimeout(() => {
        URL.revokeObjectURL(fileURL);
    }, 10000);
}
