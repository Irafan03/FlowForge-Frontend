import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NodePalette } from './NodePalette';

describe('NodePalette', () => {
  it('filters nodes and adds the selected node type', async () => {
    const user = userEvent.setup();
    const onAddNode = vi.fn();
    render(<NodePalette onAddNode={onAddNode} />);

    await user.type(screen.getByRole('textbox', { name: /rechercher/i }), 'Telegram');
    expect(screen.getByRole('button', { name: /Telegram Trigger/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gmail Trigger/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Telegram Trigger/ }));
    expect(onAddNode).toHaveBeenCalledWith('telegram_trigger');
  });
});
