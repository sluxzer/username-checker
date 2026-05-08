const { withRetry } = require('../../src/utils/http');

describe('http utils', () => {
  describe('withRetry', () => {
    it('returns result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 error', async () => {
      const err429 = { response: { status: 429 } };
      const fn = jest.fn()
        .mockRejectedValueOnce(err429)
        .mockRejectedValueOnce(err429)
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, { initialDelay: 1 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after max retries', async () => {
      const err429 = { response: { status: 429 } };
      const fn = jest.fn().mockRejectedValue(err429);
      
      await expect(withRetry(fn, { maxRetries: 2, initialDelay: 1 }))
        .rejects.toEqual(err429);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry on 404 error by default', async () => {
      const err404 = { response: { status: 404 } };
      const fn = jest.fn().mockRejectedValue(err404);
      
      await expect(withRetry(fn, { initialDelay: 1 }))
        .rejects.toEqual(err404);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
