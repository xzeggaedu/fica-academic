import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Test component that uses state
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span data-testid="count">{count}</span>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
      <Button onClick={() => setCount(count - 1)}>Decrement</Button>
    </div>
  );
}

describe('Counter Component with State', () => {
  it('starts with count of 0', () => {
    render(<Counter />);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('increments count when increment button is clicked', async () => {
    render(<Counter />);
    const incrementButton = screen.getByRole('button', { name: 'Increment' });
    const countDisplay = screen.getByTestId('count');

    fireEvent.click(incrementButton);

    await waitFor(() => {
      expect(countDisplay).toHaveTextContent('1');
    });
  });

  it('decrements count when decrement button is clicked', async () => {
    render(<Counter />);
    const decrementButton = screen.getByRole('button', { name: 'Decrement' });
    const countDisplay = screen.getByTestId('count');

    fireEvent.click(decrementButton);

    await waitFor(() => {
      expect(countDisplay).toHaveTextContent('-1');
    });
  });

  it('can increment multiple times', async () => {
    render(<Counter />);
    const incrementButton = screen.getByRole('button', { name: 'Increment' });
    const countDisplay = screen.getByTestId('count');

    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);

    await waitFor(() => {
      expect(countDisplay).toHaveTextContent('3');
    });
  });
});
